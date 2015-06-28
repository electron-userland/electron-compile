import _ from 'lodash';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import {initializeProtocolHook} from './protocol-hook';
import forAllFiles from './for-all-files';

let availableCompilers = null;

export function createAllCompilers() {
  return _.map([
    './js/babel',
    './js/coffeescript',
    './js/typescript',
    './css/less',
    './css/scss'
  ], (x) => {
    const Klass = require(x);
    return new Klass();
  });
}

export function compile(filePath, compilers=null) {
  compilers = compilers || availableCompilers;
  if (!compilers) {
    throw new Error("Call init first or pass in an array for compilers");
  }
  
  let compiler = null;
  compiler = _.find(compilers, (x) => x.shouldCompileFile(filePath));
  if (!compiler) return fs.readFileSync(filePath, 'utf8');

  let sourceCode = fs.readFileSync(filePath, 'utf8');
  return compiler.loadFile(null, filePath, true, sourceCode);
}

export function init(cacheDir=null, skipRegister=false) {
  if (!cacheDir) {
    let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
    let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

    cacheDir = path.join(tmpDir, `compileCache_${hash}`);
    mkdirp.sync(cacheDir);
  }
  
  availableCompilers = createAllCompilers();

  _.each(availableCompilers, (compiler) => {
    if (!skipRegister) compiler.register();
    compiler.setCacheDirectory(cacheDir);
  });

  // If we're not an Electron browser process, bail
  if (!process.type || process.type !== 'browser') return;
  initializeProtocolHook(availableCompilers);
}
