import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import createDigestForObject from './digest-for-object';
import {pfs, pzlib} from './promise';
import mkdirp from 'mkdirp';

const d = require('debug')('electron-compile:compile-cache');

/**
 * CompileCache manages getting and setting entries for a single compiler; each
 * in-use compiler will have an instance of this class, usually created via
 * {@link createFromCompiler}.
 *
 * You usually will not use this class directly, it is an implementation class
 * for {@link CompileHost}.
 */
export default class CompileCache {
  /**
   * Creates an instance, usually used for testing only.
   *
   * @param  {string} cachePath  The root directory to use as a cache path
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   * @param {string} sourceMapPath The directory to store sourcemap separately if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   */
  constructor(cachePath, fileChangeCache, sourceMapPath = null) {
    this.cachePath = cachePath;
    this.fileChangeCache = fileChangeCache;
    this.sourceMapPath = sourceMapPath || this.cachePath;
  }

  /**
   * Creates a CompileCache from a class compatible with the CompilerBase
   * interface. This method uses the compiler name / version / options to
   * generate a unique directory name for cached results
   *
   * @param  {string} cachePath  The root path to use for the cache, a directory
   *                             representing the hash of the compiler parameters
   *                             will be created here.
   *
   * @param  {CompilerBase} compiler  The compiler to use for version / option
   *                                  information.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  Don't attempt to create the cache directory.
   *
   * @param {string} sourceMapPath The directory to store sourcemap separately if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   *
   * @return {CompileCache}  A configured CompileCache instance.
   */
  static createFromCompiler(cachePath, compiler, fileChangeCache, readOnlyMode = false, sourceMapPath = null) {
    let newCachePath = null;
    let getCachePath = () => {
      if (newCachePath) return newCachePath;

      const digestObj = {
        name: compiler.name || Object.getPrototypeOf(compiler).constructor.name,
        version: compiler.getCompilerVersion(),
        options: compiler.compilerOptions
      };

      newCachePath = path.join(cachePath, createDigestForObject(digestObj));

      d(`Path for ${digestObj.name}: ${newCachePath}`);
      d(`Set up with parameters: ${JSON.stringify(digestObj)}`);

      if (!readOnlyMode) mkdirp.sync(newCachePath);
      return newCachePath;
    };

    let ret = new CompileCache('', fileChangeCache);
    ret.getCachePath = getCachePath;

    const newSourceMapPath = sourceMapPath;
    ret.getSourceMapPath = () => newSourceMapPath || getCachePath();

    return ret;
  }

  /**
   * Returns a file's compiled contents from the cache.
   *
   * @param  {string} filePath  The path to the file. FileChangedCache will look
   *                            up the hash and use that as the key in the cache.
   *
   * @return {Promise<Object>}  An object with all kinds of information
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  async get(filePath) {
    d(`Fetching ${filePath} from cache`);
    let hashInfo = await this.fileChangeCache.getHashForPath(path.resolve(filePath));

    let code = null;
    let mimeType = null;
    let binaryData = null;
    let dependentFiles = null;

    let cacheFile = null;
    try {
      cacheFile = path.join(this.getCachePath(), hashInfo.hash);
      let result = null;

      if (hashInfo.isFileBinary) {
        d("File is binary, reading out info");
        let info = JSON.parse(await pfs.readFile(cacheFile + '.info'));
        mimeType = info.mimeType;
        dependentFiles = info.dependentFiles;

        binaryData = hashInfo.binaryData;
        if (!binaryData) {
          binaryData = await pfs.readFile(cacheFile);
          binaryData = await pzlib.gunzip(binaryData);
        }
      } else {
        let buf = await pfs.readFile(cacheFile);
        let str = (await pzlib.gunzip(buf)).toString('utf8');

        result = JSON.parse(str);
        code = result.code;
        mimeType = result.mimeType;
        dependentFiles = result.dependentFiles;
      }
    } catch (e) {
      d(`Failed to read cache for ${filePath}, looked in ${cacheFile}: ${e.message}`);
    }

    return { hashInfo, code, mimeType, binaryData, dependentFiles };
  }


  /**
   * Saves a compiled result to cache
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @param  {string / Buffer} codeOrBinaryData   The file's contents, either as
   *                                              a string or a Buffer.
   * @param  {string} mimeType  The MIME type returned by the compiler.
   *
   * @param  {string[]} dependentFiles  The list of dependent files returned by
   *                                    the compiler.
   * @return {Promise}  Completion.
   */
  async save(hashInfo, codeOrBinaryData, mimeType, dependentFiles) {
    let buf = null;
    let target = path.join(this.getCachePath(), hashInfo.hash);
    d(`Saving to ${target}`);

    if (hashInfo.isFileBinary) {
      buf = await pzlib.gzip(codeOrBinaryData);
      await pfs.writeFile(target + '.info', JSON.stringify({mimeType, dependentFiles}), 'utf8');
    } else {
      buf = await pzlib.gzip(new Buffer(JSON.stringify({code: codeOrBinaryData, mimeType, dependentFiles})));
    }

    await pfs.writeFile(target, buf);
  }

  /**
   * Attempts to first get a key via {@link get}, then if it fails, call a method
   * to retrieve the contents, then save the result to cache.
   *
   * The fetcher parameter is expected to have the signature:
   *
   * Promise<Object> fetcher(filePath : string, hashInfo : Object);
   *
   * hashInfo is a value returned from getHashForPath
   * The return value of fetcher must be an Object with the properties:
   *
   * mimeType - the MIME type of the data to save
   * code (optional) - the source code as a string, if file is text
   * binaryData (optional) - the file contents as a Buffer, if file is binary
   * dependentFiles - the dependent files returned by the compiler.
   *
   * @param  {string} filePath  The path to the file. FileChangedCache will look
   *                            up the hash and use that as the key in the cache.
   *
   * @param  {Function} fetcher  A method which conforms to the description above.
   *
   * @return {Promise<Object>}  An Object which has the same fields as the
   *                            {@link get} method return result.
   */
  async getOrFetch(filePath, fetcher) {
    let cacheResult = await this.get(filePath);
    let anyDependenciesChanged = await this.haveAnyDependentFilesChanged(cacheResult);

    if ((cacheResult.code || cacheResult.binaryData) && !anyDependenciesChanged) {
      return cacheResult;
    }

    let result = await fetcher(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };

    if (result.mimeType && !cacheResult.hashInfo.isInNodeModules) {
      d(`Cache miss: saving out info for ${filePath}`);
      await this.save(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);

      const map = result.sourceMaps;
      if (map) {
        d(`source map for ${filePath} found, saving it to ${this.getSourceMapPath()}`);
        await this.saveSourceMap(cacheResult.hashInfo, filePath, map);
      }
    }

    result.hashInfo = cacheResult.hashInfo;
    return result;
  }

  /**
   * @private Check if any of a file's dependencies have changed
   */
  async haveAnyDependentFilesChanged(cacheResult) {
    if (!cacheResult.code || !cacheResult.dependentFiles.length) return false;

    try {
      for (let dependentFile of cacheResult.dependentFiles) {
        let hasFileChanged = await this.fileChangeCache.hasFileChanged(dependentFile);
        if (hasFileChanged) {
          return true;
        }

        let dependentFileCacheResult = await this.get(dependentFile);
        if (dependentFileCacheResult.dependentFiles && dependentFileCacheResult.dependentFiles.length) {
          let anySubdependentFilesChanged = await this.haveAnyDependentFilesChanged(dependentFileCacheResult);
          if (anySubdependentFilesChanged) return true;
        }
      }
    }
    catch (e) {
      if (e.code != "ENOENT") {
        throw e;
      } else {
        return true;
      }
    }

    return false;
  }


  getSync(filePath) {
    d(`Fetching ${filePath} from cache`);
    let hashInfo = this.fileChangeCache.getHashForPathSync(path.resolve(filePath));

    let code = null;
    let mimeType = null;
    let binaryData = null;
    let dependentFiles = null;

    try {
      let cacheFile = path.join(this.getCachePath(), hashInfo.hash);

      let result = null;
      if (hashInfo.isFileBinary) {
        d("File is binary, reading out info");
        let info = JSON.parse(fs.readFileSync(cacheFile + '.info'));
        mimeType = info.mimeType;
        dependentFiles = info.dependentFiles;

        binaryData = hashInfo.binaryData;
        if (!binaryData) {
          binaryData = fs.readFileSync(cacheFile);
          binaryData = zlib.gunzipSync(binaryData);
        }
      } else {
        let buf = fs.readFileSync(cacheFile);
        let str = (zlib.gunzipSync(buf)).toString('utf8');

        result = JSON.parse(str);
        code = result.code;
        mimeType = result.mimeType;
        dependentFiles = result.dependentFiles;
      }
    } catch (e) {
      d(`Failed to read cache for ${filePath}`);
    }

    return { hashInfo, code, mimeType, binaryData, dependentFiles };
  }

  saveSync(hashInfo, codeOrBinaryData, mimeType, dependentFiles) {
    let buf = null;
    let target = path.join(this.getCachePath(), hashInfo.hash);
    d(`Saving to ${target}`);

    if (hashInfo.isFileBinary) {
      buf = zlib.gzipSync(codeOrBinaryData);
      fs.writeFileSync(target + '.info', JSON.stringify({mimeType, dependentFiles}), 'utf8');
    } else {
      buf = zlib.gzipSync(new Buffer(JSON.stringify({code: codeOrBinaryData, mimeType, dependentFiles})));
    }

    fs.writeFileSync(target, buf);
  }

  getOrFetchSync(filePath, fetcher) {
    let cacheResult = this.getSync(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;

    let result = fetcher(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };

    if (result.mimeType && !cacheResult.hashInfo.isInNodeModules) {
      d(`Cache miss: saving out info for ${filePath}`);
      this.saveSync(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);
    }

    const map = result.sourceMaps;
    if (map) {
      d(`source map for ${filePath} found, saving it to ${this.getSourceMapPath()}`);
      this.saveSourceMapSync(cacheResult.hashInfo, filePath, map);
    }

    result.hashInfo = cacheResult.hashInfo;
    return result;
  }

  buildSourceMapTarget(hashInfo, filePath) {
    const fileName = path.basename(filePath);
    const mapFileName = fileName.replace(path.extname(fileName), '.js.map');

    const target = path.join(this.getSourceMapPath(), mapFileName);
    d(`Sourcemap target is: ${target}`);

    return target;
  }

  /**
   * Saves sourcemap string into cache, or specified separate dir
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @param  {string} filePath Path to original file to construct sourcemap file name

   * @param  {string} sourceMap Sourcemap data as string
   *
   * @memberOf CompileCache
   */
  async saveSourceMap(hashInfo, filePath, sourceMap) {
    const target = this.buildSourceMapTarget(hashInfo, filePath);
    await pfs.writeFile(target, sourceMap, 'utf-8');
  }

  saveSourceMapSync(hashInfo, filePath, sourceMap) {
    const target = this.buildSourceMapTarget(hashInfo, filePath);
    fs.writeFileSync(target, sourceMap, 'utf-8');
  }

  /**
   * @private
   */
  getCachePath() {
    // NB: This is an evil hack so that createFromCompiler can stomp it
    // at will
    return this.cachePath;
  }

  /**
   * @private
   */
  getSourceMapPath() {
    return this.sourceMapPath;
  }

  /**
   * Returns whether a file should not be compiled. Note that this doesn't
   * necessarily mean it won't end up in the cache, only that its contents are
   * saved verbatim instead of trying to find an appropriate compiler.
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @return {boolean}  True if a file should be ignored
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }
}
