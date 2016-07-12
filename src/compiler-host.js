import mimeTypes from '@paulcbetts/mime-types';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import {pfs, pzlib} from './promise';

import {forAllFiles, forAllFilesSync} from './for-all-files';
import CompileCache from './compile-cache';
import FileChangedCache from './file-change-cache';
import ReadOnlyCompiler from './read-only-compiler';

const d = require('debug-electron')('electron-compile:compiler-host');

require('./rig-mime-types').init();

// This isn't even my
const finalForms = {
  'text/javascript': true,
  'application/javascript': true,
  'text/html': true,
  'text/css': true,
  'image/svg+xml': true,
  'application/json': true
};

/**
 * This class is the top-level class that encapsulates all of the logic of
 * compiling and caching application code. If you're looking for a "Main class",
 * this is it.
 *
 * This class can be created directly but it is usually created via the methods
 * in config-parser, which will among other things, set up the compiler options
 * given a project root.
 *
 * CompilerHost is also the top-level class that knows how to serialize all of the
 * information necessary to recreate itself, either as a development host (i.e.
 * will allow cache misses and actual compilation), or as a read-only version of
 * itself for production.
 */
export default class CompilerHost {
  /**
   * Creates an instance of CompilerHost. You probably want to use the methods
   * in config-parser for development, or {@link createReadonlyFromConfiguration}
   * for production instead.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache
   *
   * @param  {Object} compilers  an Object whose keys are input MIME types and
   *                             whose values are instances of CompilerBase. Create
   *                             this via the {@link createCompilers} method in
   *                             config-parser.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  If True, cache misses will fail and
   *                                 compilation will not be attempted.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   */
  constructor(rootCacheDir, compilers, fileChangeCache, readOnlyMode, fallbackCompiler = null) {
    let compilersByMimeType = Object.assign({}, compilers);
    Object.assign(this, {rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode, fallbackCompiler});
    this.appRoot = this.fileChangeCache.appRoot;

    this.cachesForCompilers = Object.keys(compilersByMimeType).reduce((acc, x) => {
      let compiler = compilersByMimeType[x];
      if (acc.has(compiler)) return acc;

      acc.set(
        compiler,
        CompileCache.createFromCompiler(rootCacheDir, compiler, fileChangeCache, readOnlyMode));
      return acc;
    }, new Map());
  }

  /**
   * Creates a production-mode CompilerHost from the previously saved
   * configuration
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static async createReadonlyFromConfiguration(rootCacheDir, appRoot, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = await pfs.readFile(target);
    let info = JSON.parse(await pzlib.gunzip(buf));

    let fileChangeCache = FileChangedCache.loadFromData(info.fileChangeCache, appRoot, true);

    let compilers = Object.keys(info.compilers).reduce((acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new ReadOnlyCompiler(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

      return acc;
    }, {});

    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler);
  }

  /**
   * Creates a development-mode CompilerHost from the previously saved
   * configuration.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {Object} compilersByMimeType  an Object whose keys are input MIME
   *                                       types and whose values are instances
   *                                       of CompilerBase. Create this via the
   *                                       {@link createCompilers} method in
   *                                       config-parser.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static async createFromConfiguration(rootCacheDir, appRoot, compilersByMimeType, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = await pfs.readFile(target);
    let info = JSON.parse(await pzlib.gunzip(buf));

    let fileChangeCache = FileChangedCache.loadFromData(info.fileChangeCache, appRoot, false);

    Object.keys(info.compilers).forEach((x) => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });

    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler);
  }


  /**
   * Saves the current compiler configuration to a file that
   * {@link createReadonlyFromConfiguration} can use to recreate the current
   * compiler environment
   *
   * @return {Promise}  Completion
   */
  async saveConfiguration() {
    let serializedCompilerOpts = Object.keys(this.compilersByMimeType).reduce((acc, x) => {
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

  /**
   * Compiles a file and returns the compiled result.
   *
   * @param  {string} filePath  The path to the file to compile
   *
   * @return {Promise<object>}  An Object with the compiled result
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  compile(filePath) {
    return (this.readOnlyMode ? this.compileReadOnly(filePath) : this.fullCompile(filePath));
  }


  /**
   * Handles compilation in read-only mode
   *
   * @private
   */
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

    if (!compiler) {
      compiler = this.fallbackCompiler;

      let { code, binaryData, mimeType } = await compiler.get(filePath);
      return { code: code || binaryData, mimeType };
    }

    let cache = this.cachesForCompilers.get(compiler);
    let {code, binaryData, mimeType} = await cache.get(filePath);

    code = code || binaryData;
    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  /**
   * Handles compilation in read-write mode
   *
   * @private
   */
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

  /**
   * Handles invoking compilers independent of caching
   *
   * @private
   */
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
      return Object.assign(result, {dependentFiles});
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
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

  /**
   * Pre-caches an entire directory of files recursively. Usually used for
   * building custom compiler tooling.
   *
   * @param  {string} rootDirectory  The top-level directory to compile
   *
   * @param  {Function} shouldCompile (optional)  A Function which allows the
   *                                  caller to disable compiling certain files.
   *                                  It takes a fully-qualified path to a file,
   *                                  and should return a Boolean.
   *
   * @return {Promise}  Completion.
   */
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

  compileSync(filePath) {
    return (this.readOnlyMode ? this.compileReadOnlySync(filePath) : this.fullCompileSync(filePath));
  }

  static createReadonlyFromConfigurationSync(rootCacheDir, appRoot, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = fs.readFileSync(target);
    let info = JSON.parse(zlib.gunzipSync(buf));

    let fileChangeCache = FileChangedCache.loadFromData(info.fileChangeCache, appRoot, true);

    let compilers = Object.keys(info.compilers).reduce((acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new ReadOnlyCompiler(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

      return acc;
    }, {});

    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler);
  }

  static createFromConfigurationSync(rootCacheDir, appRoot, compilersByMimeType, fallbackCompiler=null) {
    let target = path.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = fs.readFileSync(target);
    let info = JSON.parse(zlib.gunzipSync(buf));

    let fileChangeCache = FileChangedCache.loadFromData(info.fileChangeCache, appRoot, false);

    Object.keys(info.compilers).forEach((x) => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });

    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler);
  }

  saveConfigurationSync() {
    let serializedCompilerOpts = Object.keys(this.compilersByMimeType).reduce((acc, x) => {
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

    if (!compiler) {
      compiler = this.fallbackCompiler;

      let { code, binaryData, mimeType } = compiler.getSync(filePath);
      return { code: code || binaryData, mimeType };
    }

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
      return Object.assign(result, {dependentFiles});
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
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


  /**
   * Returns the passthrough compiler
   *
   * @private
   */
  getPassthroughCompiler() {
    return this.compilersByMimeType['text/plain'];
  }


  /**
   * Determines whether we should even try to compile the content. Note that in
   * some cases, content will still be in cache even if this returns true, and
   * in other cases (isInNodeModules), we'll know explicitly to not even bother
   * looking in the cache.
   *
   * @private
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }
}
