import _ from 'lodash';
import mimeTypes from 'mime-types';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import {pfs, pzlib} from './promise';

import {forAllFiles, forAllFilesSync} from './for-all-files';
import CompileCache from './compile-cache';
import FileChangedCache from './file-change-cache';
import ReadOnlyCompiler from './read-only-compiler';

const d = require('debug')('electron-compile:compiler-host');

// This isn't even my
const finalForms = {
  'text/javascript': true,
  'application/javascript': true,
  'text/html': true,
  'text/css': true,
  'image/svg+xml': true
};

export default class CompilerHost {
  constructor(rootCacheDir, compilers, fileChangeCache, readOnlyMode, fallbackCompiler = null) {
    let compilersByMimeType = _.assign({}, compilers);
    _.assign(this, {rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode, fallbackCompiler});
    
    this.cachesForCompilers = _.reduce(Object.keys(compilersByMimeType), (acc, x) => {
      let compiler = compilersByMimeType[x];
      if (acc.has(compiler)) return acc;

      acc.set(compiler, CompileCache.createFromCompiler(rootCacheDir, compiler, fileChangeCache));
      return acc;
    }, new Map());
  }
    
  static async createReadonlyFromConfiguration(rootCacheDir, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = await pfs.readFile(target);
    let info = JSON.parse(await pzlib.gunzip(buf));
    
    let fileChangeCache = FileChangedCache.loadFromData(info.fileChangeCache);
    let compilers = _.reduce(Object.keys(info.compilers), (acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new ReadOnlyCompiler(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);
      
      return acc;
    }, {});
    
    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler);
  }
  
  static async createFromConfiguration(rootCacheDir, compilersByMimeType, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = await pfs.readFile(target);
    let info = JSON.parse(await pzlib.gunzip(buf));
    
    let fileChangeCache = new FileChangedCache(info.fileChangeCache, false);
    
    _.each(Object.keys(info.compilers), (x) => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });
    
    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, true, fallbackCompiler);
  }
  
  async saveConfiguration() {
    let serializedCompilerOpts = _.reduce(Object.keys(this.compilersByMimeType), (acc, x) => {
      let compiler = this.compilersByMimeType[x];
      let Klass = Object.getPrototypeOf(compiler).constructor;
      
      let val = {
        name: Klass.name,
        inputMimeTypes: Klass.getInputMimeTypes(),
        compilerOptions: compiler.compilerOptions,
        compilerVersion: compiler.getCompilerVersion()
      };
      
      acc[x] = val;
      return acc;
    }, {});
    
    let info = {
      fileChangeCache: this.fileChangeCache.getSavedData(),
      compilers: serializedCompilerOpts
    };
    
    let target = path.join(this.rootCacheDir, 'compiler-info.json.gz');
    let buf = await pzlib.gzip(new Buffer(JSON.stringify(info)));
    await pfs.writeFile(target, buf);
  }
  
  // Public: Compiles a single file given its path.
  //
  // filePath: The path on disk to the file
  //
  // Returns a {String} with the compiled output, or will throw an {Error}
  // representing the compiler errors encountered.
  compile(filePath) {
    return (this.readOnlyMode ? this.compileReadOnly(filePath) : this.fullCompile(filePath));
  }
  
  async compileReadOnly(filePath) {
    // We guarantee that node_modules are always shipped directly
    let type = mimeTypes.lookup(filePath);
    if (FileChangedCache.isInNodeModules(filePath)) {
      return { 
        mimeType: type || 'application/javascript',
        code: await pfs.readFile(filePath, 'utf8') 
      };    
    }
    
    let hashInfo = await this.fileChangeCache.getHashForPath(filePath);

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) compiler = this.fallbackCompiler;

    let cache = this.cachesForCompilers.get(compiler);
    let {code, binaryData, mimeType} = await cache.get(filePath);

    code = code || binaryData;
    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  async fullCompile(filePath) {
    d(`Compiling ${filePath}`);
    
    let hashInfo = await this.fileChangeCache.getHashForPath(filePath);
    let type = mimeTypes.lookup(filePath);
    
    if (hashInfo.isInNodeModules) {
      let code = hashInfo.sourceCode || await pfs.readFile(filePath, 'utf8');
      return { code, mimeType: type };
    }

    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) {
      d(`Falling back to passthrough compiler for ${filePath}`);
      compiler = this.fallbackCompiler;
    }

    if (!compiler) {
      throw new Error(`Couldn't find a compiler for ${filePath}`);
    }

    let cache = this.cachesForCompilers.get(compiler);
    return await cache.getOrFetch(
      filePath,
      (filePath, hashInfo) => this.compileUncached(filePath, hashInfo, compiler));
  }

  async compileUncached(filePath, hashInfo, compiler) {
    let inputMimeType = mimeTypes.lookup(filePath);
    
    if (hashInfo.isFileBinary) {
      return {
        binaryData: hashInfo.binaryData || await pfs.readFile(filePath),
        mimeType: inputMimeType,
        dependentFiles: []
      };
    }
    
    let ctx = {};
    let code = hashInfo.sourceCode || await pfs.readFile(filePath, 'utf8');

    if (!(await compiler.shouldCompileFile(code, ctx))) {
      d(`Compiler returned false for shouldCompileFile: ${filePath}`);
      return { code, mimeType: mimeTypes.lookup(filePath), dependentFiles: [] };
    }

    let dependentFiles = await compiler.determineDependentFiles(code, filePath, ctx);

    d(`Using compiler options: ${JSON.stringify(compiler.compilerOptions)}`);
    let result = await compiler.compile(code, filePath, ctx);

    let shouldInlineHtmlify = 
      inputMimeType !== 'text/html' &&
      result.mimeType === 'text/html';
    
    let isPassthrough = 
      result.mimeType === 'text/plain' || 
      !result.mimeType || 
      CompilerHost.shouldPassthrough(hashInfo);
      
    if ((finalForms[result.mimeType] && !shouldInlineHtmlify) || isPassthrough) {
      // Got something we can use in-browser, let's return it
      return _.assign(result, {dependentFiles});
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = _.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
      compiler = this.compilersByMimeType[result.mimeType || '__lolnothere'];

      if (!compiler) {
        d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

        throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
      }

      return await this.compileUncached(
        `${filePath}.${mimeTypes.extension(result.mimeType || 'txt')}`, 
        hashInfo, compiler);
    }
  }
  
  // Public: Recursively compiles an entire directory of files.
  //
  // rootDirectory: The path on disk to the directory of files to compile.
  //
  // shouldCompile: (optional) - A {Function} that determines whether to skip a
  //                             file given its full path as a parameter. If this
  //                             function returns 'false', the file is skipped.
  //
  // Returns nothing.
  async compileAll(rootDirectory, shouldCompile=null) {
    let should = shouldCompile || function() {return true;};

    await forAllFiles(rootDirectory, (f) => {
      if (!should(f)) return;

      d(`Compiling ${f}`);
      return this.compile(f, this.compilersByMimeType);
    });
  }
  
  /*
   * Sync Methods
   */
   
  // Public: Compiles a single file given its path.
  //
  // filePath: The path on disk to the file
  //
  // Returns a {String} with the compiled output, or will throw an {Error}
  // representing the compiler errors encountered.
  compileSync(filePath) {
    return (this.readOnlyMode ? this.compileReadOnlySync(filePath) : this.fullCompileSync(filePath));
  }
  
  static createReadonlyFromConfigurationSync(rootCacheDir, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = fs.readFileSync(target);
    let info = JSON.parse(zlib.gunzipSync(buf));
    
    let fileChangeCache = FileChangedCache.loadFromData(info.fileChangeCache);
    let compilers = _.reduce(Object.keys(info.compilers), (acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new ReadOnlyCompiler(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);
      
      return acc;
    }, {});
    
    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler);
  }
  
  static createFromConfigurationSync(rootCacheDir, compilersByMimeType, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = fs.readFileSync(target);
    let info = JSON.parse(zlib.gunzipSync(buf));
    
    let fileChangeCache = new FileChangedCache(info.fileChangeCache, false);
    
    _.each(Object.keys(info.compilers), (x) => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });
    
    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, true, fallbackCompiler);
  }
   
  saveConfigurationSync() {
    let serializedCompilerOpts = _.reduce(Object.keys(this.compilersByMimeType), (acc, x) => {
      let compiler = this.compilersByMimeType[x];
      let Klass = Object.getPrototypeOf(compiler).constructor;
      
      let val = {
        name: Klass.name,
        inputMimeTypes: Klass.getInputMimeTypes(),
        compilerOptions: compiler.compilerOptions,
        compilerVersion: compiler.getCompilerVersion()
      };
      
      acc[x] = val;
      return acc;
    }, {});
    
    let info = {
      fileChangeCache: this.fileChangeCache.getSavedData(),
      compilers: serializedCompilerOpts
    };
    
    let target = path.join(this.rootCacheDir, 'compiler-info.json.gz');
    let buf = zlib.gzipSync(new Buffer(JSON.stringify(info)));
    fs.writeFileSync(target, buf);
  }
  
  compileReadOnlySync(filePath) {
    // We guarantee that node_modules are always shipped directly
    let type = mimeTypes.lookup(filePath);
    if (FileChangedCache.isInNodeModules(filePath)) {
      return { 
        mimeType: type || 'application/javascript',
        code: fs.readFileSync(filePath, 'utf8') 
      };    
    }  

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);
    
    // We guarantee that node_modules are always shipped directly
    if (hashInfo.isInNodeModules) {
      return { 
        mimeType: type, 
        code: hashInfo.sourceCode || fs.readFileSync(filePath, 'utf8') 
      };    
    }

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) compiler = this.fallbackCompiler;

    let cache = this.cachesForCompilers.get(compiler);
    let {code, binaryData, mimeType} = cache.getSync(filePath);

    code = code || binaryData;
    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  fullCompileSync(filePath) {
    d(`Compiling ${filePath}`);

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);
    let type = mimeTypes.lookup(filePath);
    
    if (hashInfo.isInNodeModules) {
      let code = hashInfo.sourceCode || fs.readFileSync(filePath, 'utf8');
      return { code, mimeType: type };
    }

    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) {
      d(`Falling back to passthrough compiler for ${filePath}`);
      compiler = this.fallbackCompiler;
    }

    if (!compiler) {
      throw new Error(`Couldn't find a compiler for ${filePath}`);
    }

    let cache = this.cachesForCompilers.get(compiler);
    return cache.getOrFetchSync(
      filePath,
      (filePath, hashInfo) => this.compileUncachedSync(filePath, hashInfo, compiler));
  }

  compileUncachedSync(filePath, hashInfo, compiler) {
    let inputMimeType = mimeTypes.lookup(filePath);
    
    if (hashInfo.isFileBinary) {
      return {
        binaryData: hashInfo.binaryData || fs.readFileSync(filePath),
        mimeType: inputMimeType,
        dependentFiles: []
      };
    }
  
    let ctx = {};
    let code = hashInfo.sourceCode || fs.readFileSync(filePath, 'utf8');

    if (!(compiler.shouldCompileFileSync(code, ctx))) {
      d(`Compiler returned false for shouldCompileFile: ${filePath}`);
      return { code, mimeType: mimeTypes.lookup(filePath), dependentFiles: [] };
    }

    let dependentFiles = compiler.determineDependentFilesSync(code, filePath, ctx);

    let result = compiler.compileSync(code, filePath, ctx);

    let shouldInlineHtmlify = 
      inputMimeType !== 'text/html' &&
      result.mimeType === 'text/html';
      
    let isPassthrough = 
      result.mimeType === 'text/plain' || 
      !result.mimeType || 
      CompilerHost.shouldPassthrough(hashInfo);
      
    if ((finalForms[result.mimeType] && !shouldInlineHtmlify) || isPassthrough) {
      // Got something we can use in-browser, let's return it
      return _.assign(result, {dependentFiles});
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = _.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
      compiler = this.compilersByMimeType[result.mimeType || '__lolnothere'];

      if (!compiler) {
        d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

        throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
      }

      return this.compileUncachedSync(
        `${filePath}.${mimeTypes.extension(result.mimeType || 'txt')}`, 
        hashInfo, compiler);
    }
  }

  // Public: Recursively compiles an entire directory of files.
  //
  // rootDirectory: The path on disk to the directory of files to compile.
  //
  // shouldCompile: (optional) - A {Function} that determines whether to skip a
  //                             file given its full path as a parameter. If this
  //                             function returns 'false', the file is skipped.
  //
  // Returns nothing.
  compileAllSync(rootDirectory, shouldCompile=null) {
    let should = shouldCompile || function() {return true;};

    forAllFilesSync(rootDirectory, (f) => {
      if (!should(f)) return;
      return this.compileSync(f, this.compilersByMimeType);
    });
  }
  
  /*
   * Other stuff
   */

  getPassthroughCompiler() {
    return this.compilersByMimeType['text/plain'];
  }

  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }
}
