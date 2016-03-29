#!/usr/bin/env node
import './babel-maybefill';

import _ from 'lodash';
import path from 'path';
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

export async function packagerMain(argv) {
  // 1. Find electron-packager
  // 2. Run it, but strip the ASAR commands out
  // 3. Collect up the output paths
  // 4. Run cli.js on everything that looks like a source directory
  // 5. (if necessary) ASAR everything back up

  let packagerArgs = _.filter(
    argv.splice(2), (x) => !x.match(/^(asar|asar-unpack)/i));

  let { cmd, args } = findActualExecutable(electronPackager, packagerArgs);
  if (cmd === electronPackager) {
    d("Can't find electron-packager, falling back to where it should be as a guess!");
    cmd = findActualExecutable(path.resolve(__dirname, '..', '..', '.bin', 'electron-packager')).cmd;
  }

  let packagerOutput = await spawnPromise(cmd, args);
  let packageDirs = parsePackagerOutput(packagerOutput);

  d(`Starting compilation for ${JSON.stringify(packageDirs)}`);
  for (let packageDir of packageDirs) {
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
