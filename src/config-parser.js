import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mkdirp from 'mkdirp';
import {pfs} from './promise';

import FileChangedCache from './file-change-cache';
import CompilerHost from './compiler-host';
import registerRequireExtension from './require-hook';

const d = require('debug-electron')('electron-compile:config-parser');

// NB: We intentionally delay-load this so that in production, you can create
// cache-only versions of these compilers
let allCompilerClasses = null;

function statSyncNoException(fsPath) {
  if ('statSyncNoException' in fs) {
    return fs.statSyncNoException(fsPath);
  }

  try {
    return fs.statSync(fsPath);
  } catch (e) {
    return null;
  }
}


/**
 * Initialize the global hooks (protocol hook for file:, node.js hook)
 * independent of initializing the compiler. This method is usually called by
 * init instead of directly
 *
 * @param {CompilerHost} compilerHost  The compiler host to use.
 *
 */
export function initializeGlobalHooks(compilerHost) {
  let globalVar = (global || window);
  globalVar.globalCompilerHost = compilerHost;

  registerRequireExtension(compilerHost);

  if ('type' in process && process.type === 'browser') {
    const { app } = require('electron');
    const { initializeProtocolHook } = require('./protocol-hook');

    let protoify = function() { initializeProtocolHook(compilerHost); };
    if (app.isReady()) {
      protoify();
    } else {
      app.on('ready', protoify);
    }
  }
}


/**
 * Initialize electron-compile and set it up, either for development or
 * production use. This is almost always the only method you need to use in order
 * to use electron-compile.
 *
 * @param  {string} appRoot  The top-level directory for your application (i.e.
 *                           the one which has your package.json).
 *
 * @param  {string} mainModule  The module to require in, relative to the module
 *                              calling init, that will start your app. Write this
 *                              as if you were writing a require call from here.
 *
 * @param  {bool} productionMode   If explicitly True/False, will set read-only
 *                                 mode to be disabled/enabled. If not, we'll
 *                                 guess based on the presence of a production
 *                                 cache.
 *
 * @param  {string} cacheDir  If not passed in, read-only will look in
 *                            `appRoot/.cache` and dev mode will compile to a
 *                            temporary directory. If it is passed in, both modes
 *                            will cache to/from `appRoot/{cacheDir}`
 */
export function init(appRoot, mainModule, productionMode = null, cacheDir = null) {
  let compilerHost = null;
  let rootCacheDir = path.join(appRoot, cacheDir || '.cache');

  if (productionMode === null) {
    productionMode = !!statSyncNoException(rootCacheDir);
  }

  if (productionMode) {
    compilerHost = CompilerHost.createReadonlyFromConfigurationSync(rootCacheDir, appRoot);
  } else {
    // if cacheDir was passed in, pass it along. Otherwise, default to a tempdir.
    if (cacheDir) {
      compilerHost = createCompilerHostFromProjectRootSync(appRoot, rootCacheDir);
    } else {
      compilerHost = createCompilerHostFromProjectRootSync(appRoot);
    }

  }

  initializeGlobalHooks(compilerHost);
  require.main.require(mainModule);
}


/**
 * Creates a {@link CompilerHost} with the given information. This method is
 * usually called by {@link createCompilerHostFromProjectRoot}.
 *
 * @private
 */
export function createCompilerHostFromConfiguration(info) {
  let compilers = createCompilers();
  let rootCacheDir = info.rootCacheDir || calculateDefaultCompileCacheDirectory();

  d(`Creating CompilerHost: ${JSON.stringify(info)}, rootCacheDir = ${rootCacheDir}`);
  let fileChangeCache = new FileChangedCache(info.appRoot);

  let compilerInfo = path.join(rootCacheDir, 'compiler-info.json.gz');
  if (fs.existsSync(compilerInfo)) {
    let buf = fs.readFileSync(compilerInfo);
    let json = JSON.parse(zlib.gunzipSync(buf));
    fileChangeCache = FileChangedCache.loadFromData(json.fileChangeCache, info.appRoot, false);
  }

  Object.keys(info.options || {}).forEach((x) => {
    let opts = info.options[x];
    if (!(x in compilers)) {
      throw new Error(`Found compiler settings for missing compiler: ${x}`);
    }

    // NB: Let's hope this isn't a valid compiler option...
    if (opts.passthrough) {
      compilers[x] = compilers['text/plain'];
      delete opts.passthrough;
    }

    d(`Setting options for ${x}: ${JSON.stringify(opts)}`);
    compilers[x].compilerOptions = opts;
  });

  let ret = new CompilerHost(rootCacheDir, compilers, fileChangeCache, false, compilers['text/plain']);

  // NB: It's super important that we guarantee that the configuration is saved
  // out, because we'll need to re-read it in the renderer process
  d(`Created compiler host with options: ${JSON.stringify(info)}`);
  ret.saveConfigurationSync();
  return ret;
}

/**
 * Creates a compiler host from a .babelrc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .babelrc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */
export async function createCompilerHostFromBabelRc(file, rootCacheDir=null) {
  let info = JSON.parse(await pfs.readFile(file, 'utf8'));

  // package.json
  if ('babel' in info) {
    info = info.babel;
  }

  if ('env' in info) {
    let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  // Are we still package.json (i.e. is there no babel info whatsoever?)
  if ('name' in info && 'version' in info) {
    return createCompilerHostFromConfiguration({
      appRoot: path.dirname(file),
      options: getDefaultConfiguration(),
      rootCacheDir
    });
  }

  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: {
      'application/javascript': info
    },
    rootCacheDir
  });
}


/**
 * Creates a compiler host from a .compilerc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .compilerc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */
export async function createCompilerHostFromConfigFile(file, rootCacheDir=null) {
  let info = JSON.parse(await pfs.readFile(file, 'utf8'));

  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: info,
    rootCacheDir
  });
}


/**
 * Creates a configured {@link CompilerHost} instance from the project root
 * directory. This method first searches for a .compilerc (or .compilerc.json), then falls back to the
 * default locations for Babel configuration info. If neither are found, defaults
 * to standard settings
 *
 * @param  {string} rootDir  The root application directory (i.e. the directory
 *                           that has the app's package.json)
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */
export async function createCompilerHostFromProjectRoot(rootDir, rootCacheDir=null) {
  let compilerc = path.join(rootDir, '.compilerc');
  if (statSyncNoException(compilerc)) {
    d(`Found a .compilerc at ${compilerc}, using it`);
    return await createCompilerHostFromConfigFile(compilerc, rootCacheDir);
  }
  compilerc += '.json';
  if (statSyncNoException(compilerc)) {
    d(`Found a .compilerc at ${compilerc}, using it`);
    return await createCompilerHostFromConfigFile(compilerc, rootCacheDir);
  }

  let babelrc = path.join(rootDir, '.babelrc');
  if (statSyncNoException(babelrc)) {
    d(`Found a .babelrc at ${babelrc}, using it`);
    return await createCompilerHostFromBabelRc(babelrc, rootCacheDir);
  }

  d(`Using package.json or default parameters at ${rootDir}`);
  return await createCompilerHostFromBabelRc(path.join(rootDir, 'package.json'), rootCacheDir);
}

export function createCompilerHostFromBabelRcSync(file, rootCacheDir=null) {
  let info = JSON.parse(fs.readFileSync(file, 'utf8'));

  // package.json
  if ('babel' in info) {
    info = info.babel;
  }

  if ('env' in info) {
    let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  // Are we still package.json (i.e. is there no babel info whatsoever?)
  if ('name' in info && 'version' in info) {
    return createCompilerHostFromConfiguration({
      appRoot: path.dirname(file),
      options: getDefaultConfiguration(),
      rootCacheDir
    });
  }

  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: {
      'application/javascript': info
    },
    rootCacheDir
  });
}

export function createCompilerHostFromConfigFileSync(file, rootCacheDir=null) {
  let info = JSON.parse(fs.readFileSync(file, 'utf8'));

  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: info,
    rootCacheDir
  });
}

export function createCompilerHostFromProjectRootSync(rootDir, rootCacheDir=null) {
  let compilerc = path.join(rootDir, '.compilerc');
  if (statSyncNoException(compilerc)) {
    d(`Found a .compilerc at ${compilerc}, using it`);
    return createCompilerHostFromConfigFileSync(compilerc, rootCacheDir);
  }

  let babelrc = path.join(rootDir, '.babelrc');
  if (statSyncNoException(babelrc)) {
    d(`Found a .babelrc at ${babelrc}, using it`);
    return createCompilerHostFromBabelRcSync(babelrc, rootCacheDir);
  }

  d(`Using package.json or default parameters at ${rootDir}`);
  return createCompilerHostFromBabelRcSync(path.join(rootDir, 'package.json'), rootCacheDir);
}

/**
 * Returns what electron-compile would use as a default rootCacheDir. Usually only
 * used for debugging purposes
 *
 * @return {string}  A path that may or may not exist where electron-compile would
 *                   set up a development mode cache.
 */
export function calculateDefaultCompileCacheDirectory() {
  let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

  let cacheDir = path.join(tmpDir, `compileCache_${hash}`);
  mkdirp.sync(cacheDir);

  d(`Using default cache directory: ${cacheDir}`);
  return cacheDir;
}


/**
 * Returns the default .configrc if no configuration information can be found.
 *
 * @return {Object}  A list of default config settings for electron-compiler.
 */
export function getDefaultConfiguration() {
  return {
    'application/javascript': {
      "presets": ["stage-0", "es2015", "react"],
      "sourceMaps": "inline"
    }
  };
}

/**
 * Allows you to create new instances of all compilers that are supported by
 * electron-compile and use them directly. Currently supports Babel, CoffeeScript,
 * TypeScript, Less, and Jade.
 *
 * @return {Object}  An Object whose Keys are MIME types, and whose values
 * are instances of @{link CompilerBase}.
 */
export function createCompilers() {
  if (!allCompilerClasses) {
    // First we want to see if electron-compilers itself has been installed with
    // devDependencies. If that's not the case, check to see if
    // electron-compilers is installed as a peer dependency (probably as a
    // devDependency of the root project).
    const locations = ['electron-compilers', '../../electron-compilers'];

    for (let location of locations) {
      try {
        allCompilerClasses = require(location);
      } catch (e) {
        // Yolo
      }
    }

    if (!allCompilerClasses) {
      throw new Error("Electron compilers not found but were requested to be loaded");
    }
  }

  // NB: Note that this code is carefully set up so that InlineHtmlCompiler
  // (i.e. classes with `createFromCompilers`) initially get an empty object,
  // but will have a reference to the final result of what we return, which
  // resolves the circular dependency we'd otherwise have here.
  let ret = {};
  let instantiatedClasses = allCompilerClasses.map((Klass) => {
    if ('createFromCompilers' in Klass) {
      return Klass.createFromCompilers(ret);
    } else {
      return new Klass();
    }
  });

  instantiatedClasses.reduce((acc,x) => {
    let Klass = Object.getPrototypeOf(x).constructor;

    for (let type of Klass.getInputMimeTypes()) { acc[type] = x; }
    return acc;
  }, ret);

  return ret;
}
