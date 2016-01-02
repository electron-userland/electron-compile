#!/usr/bin/env node

import 'babel-polyfill';
import path from 'path';
import mkdirp from 'mkdirp';
import _ from 'lodash';

import {createCompilerHostFromProjectRoot} from './config-parser';
import {forAllFiles} from './for-all-files';

process.on('unhandledRejection', (e) => {
  d(e.message || e);
  d(e.stack || '');
});

process.on('uncaughtException', (e) => {
  d(e.message || e);
  d(e.stack || '');
});

async function main(appDir, sourceDirs) {
  let compilerHost = null;
  let rootCacheDir = path.join(appDir, '.cache');
  mkdirp.sync(rootCacheDir);
  
  d(`main: ${appDir}, ${JSON.stringify(sourceDirs)}`);
  try {
    compilerHost = await createCompilerHostFromProjectRoot(appDir, rootCacheDir);
  } catch (e) {
    console.error(`Couldn't set up compilers: ${e.message}`);
    d(e.stack);

    throw e;
  }
  
  await Promise.all(_.map(sourceDirs, (dir) => forAllFiles(dir, async (f) => {
    try {
      d(`Starting compilation for ${f}`);
      await compilerHost.compile(f);
    } catch (e) {
      console.error(`Failed to compile file: ${f}`);
      console.error(e.message);

      d(e.stack);
    }
  })));
  
  d('Saving out configuration');
  await compilerHost.saveConfiguration();
}

const d = require('debug')('electron-compile');

const yargs = require('yargs')
  .usage('Usage: electron-compile --appdir [root-app-dir] paths...')
  .alias('a', 'appdir')
  .describe('a', 'The top-level application directory (i.e. where your package.json is)')
  .help('h')
  .alias('h', 'help')
  .epilog('Copyright 2015');

const argv = yargs.argv;

if (!argv._ || argv._.length < 1) {
  yargs.showHelp();
  process.exit(-1);
}

const sourceDirs = argv._;
const appDir = argv.a || process.env.PWD;

main(appDir, sourceDirs)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message || e);
    d(e.stack);
    
    console.error("Compilation failed!\nFor extra information, set the DEBUG environment variable to '*'");
    process.exit(-1);
  });  
