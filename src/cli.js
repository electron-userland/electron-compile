#!/usr/bin/env node

import {compile, init} from './main';
import forAllFiles from './for-all-files';

const yargs = require('yargs')
  .usage('Usage: electron-compile --target [target-path] [source-path]')
  .alias('t', 'target')
  .describe('t', 'The target directory to write a cache directory to')
  .alias('v', 'verbose')
  .describe('v', 'Print verbose information')
  .help('h')
  .alias('h', 'help')
  .epilog('Copyright 2015');
  
const argv = yargs.argv;

if (!argv._ || argv._.length !== 1) {
  yargs.showHelp();
  process.exit(-1);
}

const sourceDir = argv._[0];
const targetDir = argv.t || './cache';

let allSucceeded = true;
init(targetDir, true);
forAllFiles(sourceDir, (f) => {
  if (argv.v) console.log(`Compiling ${f}...`);
  try {
    compile(f);
  } catch (e) {
    console.error(`Failed to compile ${f}!`);
    console.error(e.message);
    
    if (argv.v) console.error(e.stack);
    console.error("\n");
    allSucceeded = false;
  }
});

process.exit(allSucceeded ? 0 : -1);
