#!/usr/bin/env node
import './babel-maybefill';

import _ from 'lodash';
import path from 'path'
import {fs} from './promise';

import {spawnPromise, findActualExecutable} from 'spawn-rx';

const d = require('debug')('electron-compile:packager');
const electronPackager = 'electron-packager';

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

export async function main(argv) {
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
  console.log(packagerOutput);
}

if (process.mainModule === module) {
  main(process.argv)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message || e);
      d(e.stack);

      process.exit(-1);
    });
}
