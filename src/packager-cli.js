#!/usr/bin/env node
import './babel-maybefill';

import _ from 'lodash';
import path from 'path';
import rimraf from 'rimraf';

import {pfs} from './promise';
import {main} from './cli';

import {spawnPromise, findActualExecutable} from 'spawn-rx';

const d = require('debug')('electron-compile:packager');
const electronPackager = 'electron-packager';

export async function packageDirToResourcesDir(packageDir) {
  let appDir = _.find(await pfs.readdir(packageDir), (x) => x.match(/\.app$/i));
  if (appDir) {
    return path.join(packageDir, appDir, 'Contents', 'Resources', 'app');
  } else {
    return path.join(packageDir, 'resources', 'app');
  }
}

async function copySmallFile(from, to) {
  d(`Copying ${from} => ${to}`);

  let buf = await pfs.readFile(from);
  await pfs.writeFile(to, buf);
}

export function parsePackagerOutput(output) {
  // NB: Yes, this is fragile as fuck. :-/
  console.log(output);
  let lines = output.split('\n');

  let idx = _.findIndex(lines, (x) => x.match(/Wrote new app/i));
  if (idx < 1) throw new Error(`Packager output is invalid: ${output}`);
  lines = lines.splice(idx);

  // Multi-platform case
  if (lines[0].match(/Wrote new apps/)) {
    return _.filter(lines.splice(1), (x) => x.length > 1);
  } else {
    return [lines[0].replace(/^.*new app to /, '')];
  }
}

async function compileAndShim(packageDir) {
  let appDir = await packageDirToResourcesDir(packageDir);

  d(`Looking in ${appDir}`);
  for (let entry of await pfs.readdir(appDir)) {
    if (entry.match(/^node_modules$/)) continue;

    let fullPath = path.join(appDir, entry);
    let stat = await pfs.stat(fullPath);

    if (!stat.isDirectory()) continue;

    d(`Executing electron-compile: ${appDir} => ${entry}`);
    await main(appDir, [fullPath]);
  }

  d('Copying in es6-shim');
  let packageJson = JSON.parse(
    await pfs.readFile(path.join(appDir, 'package.json'), 'utf8'));

  let index = packageJson.main || 'index.js';
  packageJson.originalMain = index;
  packageJson.main = 'es6-shim.js';

  await copySmallFile(
    path.join(__dirname, 'es6-shim.js'),
    path.join(appDir, 'es6-shim.js'));

  await pfs.writeFile(
    path.join(appDir, 'package.json'),
    JSON.stringify(packageJson, null, 2));
}

export async function runAsarArchive(packageDir, asarUnpackDir) {
  let appDir = await packageDirToResourcesDir(packageDir);
  
  let asarArgs = ['pack', 'app', 'app.asar'];
  if (asarUnpackDir) {
    asarArgs.push('--unpack-dir', asarUnpackDir);
  }
  
  let { cmd, args } = findExecutableOrGuess('asar', asarArgs);
  await spawnPromise(cmd, args, { cwd: appDir });
  rimraf.sync(path.join(appDir, 'app'));
}

export function findExecutableOrGuess(cmdToFind, argsToUse) {
  let { cmd, args } = findActualExecutable(cmdToFind, argsToUse);
  if (cmd === electronPackager) {
    d(`Can't find ${cmdToFind}, falling back to where it should be as a guess!`);
    cmd = findActualExecutable(path.resolve(__dirname, '..', '..', '.bin', cmdToFind)).cmd;
  }
  
  return { cmd, args };
}

export async function packagerMain(argv) {
  let packagerArgs = _.filter(
    argv.splice(2), (x) => !x.match(/^(asar|asar-unpack)/i));
    
  if (_.find(argv, (x) => x.match(/^--asar-unpack$/))) {
    throw new Error("electron-compile doesn't support --asar-unpack at the moment, use asar-unpack-dir");
  }
  
  let { cmd, args } = findExecutableOrGuess(electronPackager, packagerArgs);
  
  let packagerOutput = await spawnPromise(cmd, args);
  let packageDirs = parsePackagerOutput(packagerOutput);

  d(`Starting compilation for ${JSON.stringify(packageDirs)}`);
  for (let packageDir of packageDirs) {
    await compileAndShim(packageDir);
  
    let shouldAsar = _.find(argv, (x) => x.match(/^asar/i));
    if (!shouldAsar) return;
    
    let indexOfUnpack = _.findIndex(argv, (x) => x.match(/^asar-unpack-dir$/));
    
    let asarUnpackDir = null;
    if (indexOfUnpack >= 0 && argv.length+1 < indexOfUnpack) {
      asarUnpackDir = argv[indexOfUnpack+1];
    }
    
    await runAsarArchive(packageDir, asarUnpackDir);
  }
}

if (process.mainModule === module) {
  packagerMain(process.argv)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message || e);
      d(e.stack);

      process.exit(-1);
    });
}
