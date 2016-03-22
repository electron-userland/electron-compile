#!/usr/bin/env node
import './babel-maybefill';

import path from 'path'
import {fs} from './promise';

const d = require('debug')('electron-compile:packager');

export async function main(argv) {
  // 1. Find electron-packager
  // 2. Run it, but strip the ASAR commands out
  // 3. Collect up the output paths
  // 4. Run cli.js on everything that looks like a source directory
  // 5. (if necessary) ASAR everything back up
}

main(process.argv)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message || e);
    d(e.stack);

    console.error("Compilation failed!\nFor extra information, set the DEBUG environment variable to '*'");
    process.exit(-1);
  });
