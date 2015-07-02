import _ from 'lodash';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import initializeProtocolHook from './protocol-hook';
import forAllFiles from './for-all-files';

// Public: Allows you to create new instances of all compilers that are 
// supported by electron-compile and use them directly. Currently supports
// Babel, CoffeeScript, TypeScript, LESS, and Sass/SCSS.
//
// Returns an {Array} of {CompileCache} objects.
export function createAllCompilers(compilerOpts={}) {
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

let availableCompilers = null;
let lastCacheDir = null;

// Public: Compiles a single file given its path.
//
// filePath: The path on disk to the file
// compilers: (optional) - An {Array} of objects conforming to {CompileCache}
//                         that will be tried in-order to compile code. You must
//                         call init() first if this parameter is null.
//
// Returns a {String} with the compiled output, or will throw an {Error} 
// representing the compiler errors encountered.
export function compile(filePath, compilers=null) {
  compilers = compilers || availableCompilers;
  if (!compilers) {
    throw new Error("Call init() first or pass in an Array to the compilers parameter");
  }
  
  let compiler = null;
  compiler = _.find(compilers, (x) => x.shouldCompileFile(filePath));
  if (!compiler) return fs.readFileSync(filePath, 'utf8');

  let sourceCode = fs.readFileSync(filePath, 'utf8');
  return compiler.loadFile(null, filePath, true, sourceCode);
}

// Public: Recursively compiles an entire directory of files.
//
// rootDirectory: The path on disk to the directory of files to compile.
// compilers: (optional) - An {Array} of objects conforming to {CompileCache}
//                         that will be tried in-order to compile code.
//
// Returns nothing.
export function compileAll(rootDirectory, compilers=null) {
  forAllFiles(rootDirectory, (f) => compile(f, compilers));
}


// Public: Initializes the electron-compile library. Once this method is called,
//         all JavaScript and CSS that is loaded will now be first transpiled, in
//         both the browser and renderer processes. 
//
//         Note that because of limitations in Electron, this does **not** apply 
//         to WebView or Browser preload scripts - call init again at the top of
//         these scripts to set everything up again.
//
// cacheDir: The directory to cache compiled JS and CSS to. If not given, one 
//           will be generated from the Temp directory.
//
// skipRegister: Do not register with the node.js module system - this is used 
// mostly for unit test purposes.
//
// Returns nothing.
export function init(cacheDir=null, skipRegister=false) {
  this.initWithOptions({
    cacheDir: cacheDir,
    skipRegister: skipRegister
  });
}

export function initWithOptions(options={}) {
  let {cacheDir, skipRegister, compilers} = options;
  if (lastCacheDir === cacheDir && availableCompilers) return;
  
  if (!cacheDir) {
    let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
    let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

    cacheDir = path.join(tmpDir, `compileCache_${hash}`);
    mkdirp.sync(cacheDir);
  }
  
  availableCompilers = compilers || createAllCompilers();
  lastCacheDir = cacheDir;

  _.each(availableCompilers, (compiler) => {
    if (!skipRegister) compiler.register();
    compiler.setCacheDirectory(cacheDir);
  });

  // If we're not an Electron browser process, bail
  if (!process.type || process.type !== 'browser') return;
  initializeProtocolHook(availableCompilers, cacheDir);
}
