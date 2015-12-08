import _ from 'lodash';
import mimeTypes from 'mime-types';
import fs from 'fs';
import pify from 'pify';

import {forAllFiles, forAllFilesSync} from './for-all-files';
import {CompileCache} from './compile-cache';

const pfs = pify(fs);

export default class CompilerHost {
  constructor(rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode) {
    _.assign(this, {rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode});

    this.cachesForCompilers = _.reduce(Object.keys(compilersByMimeType), (acc, x) => {
      let compiler = compilersByMimeType[x];
      acc[compiler] = acc[compiler] || CompileCache.createFromCompiler(rootCacheDir, compiler, fileChangeCache);

      return acc;
    }, {});
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
    let hashInfo = await this.fileChangeCache.getHashForPath(filePath);
    let type = mimeTypes.lookup(filePath);

    let compiler = CompilerHost.shouldPassthrough(hashInfo) ?
      this.getPassthroughCompiler() :
      this.compilersByMimeType(type || '__lolnothere');

    if (!compiler) {
      // XXX: Debug print that we're falling back
      compiler = this.getPassthroughCompiler();
    }

    let cache = this.cachesForCompilers[compiler];
    let {code, mimeType} = await cache.get(filePath);

    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  fullCompile(filePath) {
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
      return this.compile(f, this.compilersByMimeType);
    });
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

  getPassthroughCompiler() {
    return this.compilersByMimeType['text/plain'];
  }

  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap;
  }
}
