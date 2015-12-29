import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import pify from 'pify';

import FileChangedCache from './file-change-cache';
import CompilerHost from './compiler-host';

const pfs = pify(fs);
const d = require('debug')('electron-compile:config-parser');

// NB: We intentionally delay-load this so that in production, you can create
// cache-only versions of these compilers
let allCompilerClasses = null;

export function createCompilerHostFromConfiguration(info) {
  let compilers = createCompilers();
  let rootCacheDir = info.rootCacheDir || calculateDefaultCompileCacheDirectory();
  
  let fileChangeCache = new FileChangedCache(info.appRoot);
  let ret = new CompilerHost(rootCacheDir, compilers, fileChangeCache, false, compilers['text/plain']);
  
  _.each(Object.keys(info.options || {}), (x) => {
    let opts = info.options[x];
    if (!(x in compilers)) {
      throw new Error(`Found compiler settings for missing compiler: ${x}`);
    }
    
    d(`Setting options for ${x}: ${JSON.stringify(opts)}`);
    compilers[x].compilerOptions = opts;
  });
  
  // NB: It's super important that we guarantee that the configuration is saved
  // out, because we'll need to re-read it in the renderer process
  d(`Created compiler host with options: ${JSON.stringify(info)}`);
  ret.saveConfigurationSync();
  return ret;
}

export async function createCompilerHostFromBabelRc(file) {
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
      options: getDefaultConfiguration()
    });
  }
  
  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: {
      'application/javascript': info
    }
  });
}

export async function createCompilerHostFromConfigFile(file) {
  let info = JSON.parse(await pfs.readFile(file, 'utf8'));
  
  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }
  
  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: info
  });
}

export async function createCompilerHostFromProjectRoot(rootDir) {
  let compilerc = path.join(rootDir, '.compilerc');
  if (await pfs.exists(compilerc)) {
    return createCompilerHostFromConfigFile(compilerc);
  }
  
  let babelrc = path.join(rootDir, '.babelrc');
  if (await pfs.exists(compilerc)) {
    return createCompilerHostFromBabelRc(babelrc);
  }
    
  return createCompilerHostFromBabelRc(path.join(rootDir, 'package.json'));
}

export function createCompilerHostFromBabelRcSync(file) {
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
      options: getDefaultConfiguration()
    });
  }
  
  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: {
      'text/javascript': info
    }
  });
}

export function createCompilerHostFromConfigFileSync(file) {
  let info = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }
  
  return createCompilerHostFromConfiguration({
    appRoot: path.dirname(file),
    options: info
  });
}

export function createCompilerHostFromProjectRootSync(rootDir) {
  let compilerc = path.join(rootDir, '.compilerc');
  if (fs.existsSync(compilerc)) {
    return createCompilerHostFromConfigFileSync(compilerc);
  }
  
  let babelrc = path.join(rootDir, '.babelrc');
  if (fs.existsSync(compilerc)) {
    return createCompilerHostFromBabelRcSync(babelrc);
  }
    
  return createCompilerHostFromBabelRcSync(path.join(rootDir, 'package.json'));
}

export function calculateDefaultCompileCacheDirectory() {
  let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

  let cacheDir = path.join(tmpDir, `compileCache_${hash}`);
  mkdirp.sync(cacheDir);
  
  d(`Using default cache directory: ${cacheDir}`);
  return cacheDir;
}

export function getDefaultConfiguration() {
  return {
    'application/javascript': {
      "presets": ["stage-0", "es2015"],
      "sourceMaps": "inline"
    }
  };
}

// Public: Allows you to create new instances of all compilers that are
// supported by electron-compile and use them directly. Currently supports
// Babel, CoffeeScript, TypeScript, LESS, and Sass/SCSS.
//
// Returns an {Object} whose Keys are MIME types, and whose values are objects
// which conform to {CompilerBase}.
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
  let instantiatedClasses = _.map(allCompilerClasses, (Klass) => {
    if ('createFromCompilers' in Klass) {
      return Klass.createFromCompilers(ret);
    } else {
      return new Klass();
    }
  });

  _.reduce(instantiatedClasses, (acc,x) => {
    let Klass = Object.getPrototypeOf(x).constructor;

    for (let type of Klass.getInputMimeTypes()) { acc[type] = x; }
    return acc;
  }, ret);
  
  return ret;
}
