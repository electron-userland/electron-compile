import _ from 'lodash';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import initializeProtocolHook from './protocol-hook';
import forAllFiles from './for-all-files';

import ReadOnlyCompiler from './read-only-compiler';

// NB: We intentionally delay-load this so that in production, you can create
// cache-only versions of these compilers
let allCompilerClasses = null;

// Public: Allows you to create new instances of all compilers that are
// supported by electron-compile and use them directly. Currently supports
// Babel, CoffeeScript, TypeScript, LESS, and Sass/SCSS.
//
// Returns an {Array} of {CompileCache} objects.
export function createAllCompilers(compilerOpts=null) {
  allCompilerClasses = allCompilerClasses || require('electron-compilers');

  return _.map(allCompilerClasses, (Klass) => {
    if (!compilerOpts) return new Klass();

    let exts = Klass.getExtensions();
    let optsForUs = _.reduce(
      exts,
      (acc,x) => _.extend(acc, compilerOpts[x] || {}),
      {});

    return new Klass(optsForUs);
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
  initWithOptions({
    cacheDir: cacheDir,
    skipRegister: skipRegister
  });
}

// Public: Initializes the electron-compile library using only cached / 
// precompiled files. Since this method won't use any of the compilers in
// electron-compilers, you can remove this package from node_modules in
// production builds and save a _lot_ of on-disk space.
//
// If you used the CLI version of electron-compile,
// all you need to pass in is the {cacheDir} parameter. If you compiled
// your files progmatically via {compile}/{compileAll}, you also need to
// pass in the object that was generated at the time from calling
// {collectCompilerInformation} from your array of registered compilers.
//
// cacheDir: The path to a directory of precompiled assets
//
// compilerInformation (optional): The object returned by 
// {collectCompilerInformation}, only necessary if you generated the cache
// via {compile}/{compileAll} manually.
//
// options (optional): Additional options to pass to {initWithOptions}.
//
// Returns nothing.
export function initForProduction(cacheDir, compilerInformation=null, options={}) {
  if (!compilerInformation) {
    try {
      compilerInformation = JSON.parse(
        fs.readFileSync(path.join(cacheDir, 'settings.json')));
    } catch (e) {
      throw new Error("Couldn't determine compiler information, either pass it as a parameter or save it in $cacheDir/settings.json: " + e.message);
    }
  }
  
  let compilers = createProductionCompilersForInfo(compilerInformation);
  let opts = _.extend({}, options, { cacheDir, compilers });
  initWithOptions(opts);
}

// Public: Initializes the electron-compile library. Once this method is called,
//         all JavaScript and CSS that is loaded will now be first transpiled, in
//         both the browser and renderer processes.
//
//         Note that because of limitations in Electron, this does **not** apply
//         to WebView or Browser preload scripts - call init again at the top of
//         these scripts to set everything up again.
//
//  options: an options {Object} with the following keys:
//
//     :cacheDir - The directory to cache compiled JS and CSS to. If not given,
//                 one will be generated from the Temp directory.
//
//     :skipRegister - Do not register with the node.js module system. For testing.
//
//     :compilers - An {Array} of compilers conforming to {CompileCache}, usually
//                  created via {createAllCompilers}.
//
//     :compilerOpts - An {Object} which will be used to initialize compilers - the
//                     keys are the extension without a dot (i.e. 'js'), and the
//                     values are the options object that this compiler would take.
//
//                     For example: {'js': { comments: false }} will disable comments
//                     in Babel's generated output. See the compiler's associated docs
//                     for what can be passed in as options.
//
// Returns nothing.
export function initWithOptions(options={}) {
  let {cacheDir, skipRegister, compilers} = options;
  if (lastCacheDir === cacheDir && availableCompilers) return;

  if (!cacheDir) {
    let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
    let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

    cacheDir = path.join(tmpDir, `compileCache_${hash}`);
    mkdirp.sync(cacheDir);
  }

  availableCompilers = compilers || createAllCompilers(options.compilerOpts);
  lastCacheDir = cacheDir;

  _.each(availableCompilers, (compiler) => {
    if (!skipRegister) compiler.register();
    compiler.setCacheDirectory(cacheDir);
  });

  // If we're not an Electron browser process, bail
  if (!process.type || process.type !== 'browser') return;

  const app = require('app');
  const initProtoHook = () => initializeProtocolHook(availableCompilers, cacheDir);

  if (app.isReady()) {
    initProtoHook();
  } else {
    app.on('ready', initProtoHook);
  }
}

// Public: Returns information about the current compilers' configured options.
// This information can be used to create a read-only version of a compiler that
// only returns cached / precompiled information.
//
// compilers: (optional) - An {Array} of objects conforming to {CompileCache}
//                         that will be tried in-order to compile code. You must
//                         call init() first if this parameter is null.
//
// Returns an {Object} whose keys are the joined list of extensions from the
// compilers (i.e. ['js', 'jsx'] has a key of 'js,jsx'), and whose value is the
// result of getCompilerInformation (i.e. an {Object} representing the compiler
// configuration for that compiler).
export function collectCompilerInformation(compilers=null) {
  compilers = compilers || availableCompilers;
  if (!compilers) {
    throw new Error("Call init() first or pass in an Array to the compilers parameter");
  }

  return _.reduce(compilers, (acc,x) => {
    let opts = x.getCompilerInformation();
    let key = opts.extensions.join(',');

    acc[key] = {
      options: opts,
      mimeType: x.getMimeType()
    };

    return acc;
  }, {});
}

// Public: Returns a set of compilers that will mimic the compilers whose info
// was gathered via {collectCompilerInformation}, but will only return cached
// versions (i.e. if a file actually needs to be compiled, the compiler will 
// throw an exception). 
//
// compilerInfo: the {Object} returned from {collectCompilerInformation}.
//
// Returns an {Array} of objects conforming to {CompileCache}.
export function createProductionCompilersForInfo(compilerInfo) {
  return _.map(
    Object.keys(compilerInfo), 
    (x) => new ReadOnlyCompiler(compilerInfo[x].options, compilerInfo[x].mimeType));
}
