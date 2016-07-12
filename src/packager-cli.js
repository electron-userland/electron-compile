#!/usr/bin/env node
import './babel-maybefill';

import path from 'path';
import rimraf from 'rimraf';

import {pfs} from './promise';
import {main} from './cli';

import {spawnPromise, findActualExecutable} from 'spawn-rx';

const d = require('debug-electron')('electron-compile:packager');
const electronPackager = 'electron-packager';

export async function packageDirToResourcesDir(packageDir) {
  let appDir = (await pfs.readdir(packageDir)).find((x) => x.match(/\.app$/i));
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

export function splitOutAsarArguments(argv) {
  if (argv.find((x) => x.match(/^--asar-unpack$/))) {
    throw new Error("electron-compile doesn't support --asar-unpack at the moment, use asar-unpack-dir");
  }

  // Strip --asar altogether
  let ret = argv.filter((x) => !x.match(/^--asar/));

  if (ret.length === argv.length) { return { packagerArgs: ret, asarArgs: null }; }

  let indexOfUnpack = ret.findIndex((x) => x.match(/^--asar-unpack-dir$/));
  if (indexOfUnpack < 0) {
    return { packagerArgs: ret, asarArgs: [] };
  }

  let unpackArgs = ret.slice(indexOfUnpack, indexOfUnpack+1);
  let notUnpackArgs = ret.slice(0, indexOfUnpack).concat(ret.slice(indexOfUnpack+2));

  return { packagerArgs: notUnpackArgs, asarArgs: unpackArgs };
}

export function parsePackagerOutput(output) {
  // NB: Yes, this is fragile as fuck. :-/
  console.log(output);
  let lines = output.split('\n');

  let idx = lines.findIndex((x) => x.match(/Wrote new app/i));
  if (idx < 1) throw new Error(`Packager output is invalid: ${output}`);
  lines = lines.splice(idx);

  // Multi-platform case
  if (lines[0].match(/Wrote new apps/)) {
    return lines.splice(1).filter((x) => x.length > 1);
  } else {
    return [lines[0].replace(/^.*new app to /, '')];
  }
}

async function compileAndShim(packageDir) {
  let appDir = await packageDirToResourcesDir(packageDir);

  d(`Looking in ${appDir}`);
  for (let entry of await pfs.readdir(appDir)) {
    if (entry.match(/^(node_modules|bower_components)$/)) continue;

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

  d(`Running ${cmd} ${JSON.stringify(args)}`);
  await spawnPromise(cmd, args, { cwd: path.join(appDir, '..') });
  rimraf.sync(path.join(appDir));
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
  d(`argv: ${JSON.stringify(argv)}`);
  argv = argv.splice(2);

  let { packagerArgs, asarArgs } = splitOutAsarArguments(argv);
  let { cmd, args } = findExecutableOrGuess(electronPackager, packagerArgs);

  d(`Spawning electron-packager: ${JSON.stringify(args)}`);
  let packagerOutput = await spawnPromise(cmd, args);
  let packageDirs = parsePackagerOutput(packagerOutput);

  d(`Starting compilation for ${JSON.stringify(packageDirs)}`);
  for (let packageDir of packageDirs) {
    await compileAndShim(packageDir);

    if (!asarArgs) continue;

    d('Starting ASAR packaging');
    let asarUnpackDir = null;
    if (asarArgs.length === 2) {
      asarUnpackDir = asarArgs[1];
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
