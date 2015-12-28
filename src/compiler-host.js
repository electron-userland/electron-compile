import _ from 'lodash';
import mimeTypes from 'mime-types';
import fs from 'fs';
import pify from 'pify';

import {forAllFiles, forAllFilesSync} from './for-all-files';
import CompileCache from './compile-cache';

const d = require('debug')('electron-compile:compiler-host');
const pfs = pify(fs);

// This isn't even my
const finalForms = {
  'text/javascript': true,
  'application/javascript': true,
  'text/html': true,
  'text/css': true
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

  // Public: Compiles a single file given its path.
  //
  // filePath: The path on disk to the file
  //
  // Returns a {String} with the compiled output, or will throw an {Error}
  // representing the compiler errors encountered.
  compile(filePath) {
    return (this.readOnlyMode ? this.compileReadOnly(filePath) : this.fullCompile(filePath));
  }
  
  // Public: Compiles a single file given its path.
  //
  // filePath: The path on disk to the file
  //
  // Returns a {String} with the compiled output, or will throw an {Error}
  // representing the compiler errors encountered.
  compileSync(filePath) {
    return (this.readOnlyMode ? this.compileReadOnlySync(filePath) : this.fullCompileSync(filePath));
  }

  async compileReadOnly(filePath) {
    let hashInfo = await this.fileChangeCache.getHashForPath(filePath);
    let type = mimeTypes.lookup(filePath);

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType(type || '__lolnothere');

    if (!compiler) compiler = this.fallbackCompiler;

    let cache = this.cachesForCompilers.get(compiler);
    let {code, mimeType} = await cache.get(filePath);

    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  async fullCompile(filePath) {
    d(`Compiling ${filePath}`);

    let hashInfo = await this.fileChangeCache.getHashForPath(filePath);
    let type = mimeTypes.lookup(filePath);

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
    let ctx = {};
    let inputMimeType = mimeTypes.lookup(filePath);
    let code = hashInfo.sourceCode || await pfs.readFile(filePath, 'utf8');

    if (!(await compiler.shouldCompileFile(code, ctx))) {
      d(`Compiler returned false for shouldCompileFile: ${filePath}`);
      return { code, mimeType: mimeTypes.lookup(filePath), dependentFiles: [] };
    }

    let dependentFiles = await compiler.determineDependentFiles(code, filePath, ctx);

    let result = await compiler.compile(code, filePath, ctx);

    let shouldInlineHtmlify = 
      inputMimeType !== 'text/html' &&
      result.mimeType === 'text/html';
      
    if (finalForms[result.mimeType] && !shouldInlineHtmlify) {
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
  
  compileReadOnlySync(filePath) {
    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);
    let type = mimeTypes.lookup(filePath);

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType(type || '__lolnothere');

    if (!compiler) compiler = this.fallbackCompiler;

    let cache = this.cachesForCompilers.get(compiler);
    let {code, mimeType} = cache.getSync(filePath);

    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  fullCompileSync(filePath) {
    d(`Compiling ${filePath}`);

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);
    let type = mimeTypes.lookup(filePath);

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
    let ctx = {};
    let inputMimeType = mimeTypes.lookup(filePath);
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
      
    if (finalForms[result.mimeType] && !shouldInlineHtmlify) {
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
