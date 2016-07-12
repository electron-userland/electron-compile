import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import {pfs, pzlib} from './promise';
import sanitizeFilePath from './sanitize-paths';

const d = require('debug-electron')('electron-compile:file-change-cache');

/**
 * This class caches information about files and determines whether they have
 * changed contents or not. Most importantly, this class caches the hash of seen
 * files so that at development time, we don't have to recalculate them constantly.
 *
 * This class is also the core of how electron-compile runs quickly in production
 * mode - after precompilation, the cache is serialized along with the rest of the
 * data in {@link CompilerHost}, so that when we load the app in production mode,
 * we don't end up calculating hashes of file content at all, only using the contents
 * of this cache.
 */
export default class FileChangedCache {
  constructor(appRoot, failOnCacheMiss=false) {
    this.appRoot = sanitizeFilePath(appRoot);

    this.failOnCacheMiss = failOnCacheMiss;
    this.changeCache = {};
  }

  /**
   * Allows you to create a FileChangedCache from serialized data saved from
   * {@link getSavedData}.
   *
   * @param  {Object} data  Saved data from getSavedData.
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {boolean} failOnCacheMiss (optional)  If True, cache misses will throw.
   *
   * @return {FileChangedCache}
   */
  static loadFromData(data, appRoot, failOnCacheMiss=true) {
    let ret = new FileChangedCache(appRoot, failOnCacheMiss);
    ret.changeCache = data.changeCache;
    ret.originalAppRoot = data.appRoot;

    return ret;
  }


  /**
   * Allows you to create a FileChangedCache from serialized data saved from
   * {@link save}.
   *
   * @param  {string} file  Saved data from save.
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {boolean} failOnCacheMiss (optional)  If True, cache misses will throw.
   *
   * @return {Promise<FileChangedCache>}
   */
  static async loadFromFile(file, appRoot, failOnCacheMiss=true) {
    d(`Loading canned FileChangedCache from ${file}`);

    let buf = await pfs.readFile(file);
    return FileChangedCache.loadFromData(JSON.parse(await pzlib.gunzip(buf)), appRoot, failOnCacheMiss);
  }


  /**
   * Returns information about a given file, including its hash. This method is
   * the main method for this cache.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   *
   * @return {Promise<Object>}
   *
   * @property {string} hash  The SHA1 hash of the file
   * @property {boolean} isMinified  True if the file is minified
   * @property {boolean} isInNodeModules  True if the file is in a library directory
   * @property {boolean} hasSourceMap  True if the file has a source map
   * @property {boolean} isFileBinary  True if the file is not a text file
   * @property {Buffer} binaryData (optional)  The buffer that was read if the file
   *                                           was binary and there was a cache miss.
   * @property {string} code (optional)  The string that was read if the file
   *                                     was text and there was a cache miss
   */
  async getHashForPath(absoluteFilePath) {
    let cacheKey = sanitizeFilePath(absoluteFilePath);
    if (this.appRoot) {
      cacheKey = cacheKey.replace(this.appRoot, '');
    }

    // NB: We do this because x-require will include an absolute path from the
    // original built app and we need to still grok it
    if (this.originalAppRoot) {
      cacheKey = cacheKey.replace(this.originalAppRoot, '');
    }

    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) {
        d(`Tried to read file cache entry for ${absoluteFilePath}`);
        d(`cacheKey: ${cacheKey}, appRoot: ${this.appRoot}, originalAppRoot: ${this.originalAppRoot}`);
        throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
      }

      return cacheEntry.info;
    }

    let stat = await pfs.stat(absoluteFilePath);
    let ctime = stat.ctime.getTime();
    let size = stat.size;
    if (!stat || !stat.isFile()) throw new Error(`Can't stat ${absoluteFilePath}`);

    if (cacheEntry) {
      if (cacheEntry.ctime >= ctime && cacheEntry.size === size) {
        return cacheEntry.info;
      }

      d(`Invalidating cache entry: ${cacheEntry.ctime} === ${ctime} && ${cacheEntry.size} === ${size}`);
      delete this.changeCache.cacheEntry;
    }

    let {digest, sourceCode, binaryData} = await this.calculateHashForFile(absoluteFilePath);

    let info = {
      hash: digest,
      isMinified: FileChangedCache.contentsAreMinified(sourceCode || ''),
      isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
      hasSourceMap: FileChangedCache.hasSourceMap(sourceCode || ''),
      isFileBinary: !!binaryData
    };

    this.changeCache[cacheKey] = { ctime, size, info };
    d(`Cache entry for ${cacheKey}: ${JSON.stringify(this.changeCache[cacheKey])}`);

    if (binaryData) {
      return Object.assign({binaryData}, info);
    } else {
      return Object.assign({sourceCode}, info);
    }
  }


  /**
   * Returns data that can passed to {@link loadFromData} to rehydrate this cache.
   *
   * @return {Object}
   */
  getSavedData() {
    return { changeCache: this.changeCache, appRoot: this.appRoot };
  }

  /**
   * Serializes this object's data to a file.
   *
   * @param {string} filePath  The path to save data to.
   *
   * @return {Promise} Completion.
   */
  async save(filePath) {
    let toSave = this.getSavedData();

    let buf = await pzlib.gzip(new Buffer(JSON.stringify(toSave)));
    await pfs.writeFile(filePath, buf);
  }

  async calculateHashForFile(absoluteFilePath) {
    let buf = await pfs.readFile(absoluteFilePath);
    let encoding = FileChangedCache.detectFileEncoding(buf);

    if (!encoding) {
      let digest = crypto.createHash('sha1').update(buf).digest('hex');
      return { sourceCode: null, digest, binaryData: buf };
    }

    let sourceCode = await pfs.readFile(absoluteFilePath, encoding);
    let digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

    return {sourceCode, digest, binaryData: null };
  }

  getHashForPathSync(absoluteFilePath) {
    let cacheKey = sanitizeFilePath(absoluteFilePath);
    if (this.appRoot) {
      cacheKey = cacheKey.replace(this.appRoot, '');
    }

    // NB: We do this because x-require will include an absolute path from the
    // original built app and we need to still grok it
    if (this.originalAppRoot) {
      cacheKey = cacheKey.replace(this.originalAppRoot, '');
    }

    if (this.realAppRoot) {
      cacheKey = cacheKey.replace(this.realAppRoot, '');
    }

    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) {
        d(`Tried to read file cache entry for ${absoluteFilePath}`);
        d(`cacheKey: ${cacheKey}, appRoot: ${this.appRoot}, originalAppRoot: ${this.originalAppRoot}`);
        throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
      }

      return cacheEntry.info;
    }

    let stat = fs.statSync(absoluteFilePath);
    let ctime = stat.ctime.getTime();
    let size = stat.size;
    if (!stat || !stat.isFile()) throw new Error(`Can't stat ${absoluteFilePath}`);

    if (cacheEntry) {
      if (cacheEntry.ctime >= ctime && cacheEntry.size === size) {
        return cacheEntry.info;
      }

      d(`Invalidating cache entry: ${cacheEntry.ctime} === ${ctime} && ${cacheEntry.size} === ${size}`);
      delete this.changeCache.cacheEntry;
    }

    let {digest, sourceCode, binaryData} = this.calculateHashForFileSync(absoluteFilePath);

    let info = {
      hash: digest,
      isMinified: FileChangedCache.contentsAreMinified(sourceCode || ''),
      isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
      hasSourceMap: FileChangedCache.hasSourceMap(sourceCode || ''),
      isFileBinary: !!binaryData
    };

    this.changeCache[cacheKey] = { ctime, size, info };
    d(`Cache entry for ${cacheKey}: ${JSON.stringify(this.changeCache[cacheKey])}`);

    if (binaryData) {
      return Object.assign({binaryData}, info);
    } else {
      return Object.assign({sourceCode}, info);
    }
  }

  saveSync(filePath) {
    let toSave = this.getSavedData();

    let buf = zlib.gzipSync(new Buffer(JSON.stringify(toSave)));
    fs.writeFileSync(filePath, buf);
  }

  calculateHashForFileSync(absoluteFilePath) {
    let buf = fs.readFileSync(absoluteFilePath);
    let encoding = FileChangedCache.detectFileEncoding(buf);

    if (!encoding) {
      let digest = crypto.createHash('sha1').update(buf).digest('hex');
      return { sourceCode: null, digest, binaryData: buf};
    }

    let sourceCode = fs.readFileSync(absoluteFilePath, encoding);
    let digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

    return {sourceCode, digest, binaryData: null};
  }


  /**
   * Determines via some statistics whether a file is likely to be minified.
   *
   * @private
   */
  static contentsAreMinified(source) {
    let length = source.length;
    if (length > 1024) length = 1024;

    let newlineCount = 0;

    // Roll through the characters and determine the average line length
    for(let i=0; i < source.length; i++) {
      if (source[i] === '\n') newlineCount++;
    }

    // No Newlines? Any file other than a super small one is minified
    if (newlineCount === 0) {
      return (length > 80);
    }

    let avgLineLength = length / newlineCount;
    return (avgLineLength > 80);
  }


  /**
   * Determines whether a path is in node_modules or the Electron init code
   *
   * @private
   */
  static isInNodeModules(filePath) {
    return !!(filePath.match(/(node_modules|bower_components)[\\\/]/i) || filePath.match(/(atom|electron)\.asar/));
  }


  /**
   * Returns whether a file has an inline source map
   *
   * @private
   */
  static hasSourceMap(sourceCode) {
    const trimmed = sourceCode.trim();
    return trimmed.lastIndexOf('//# sourceMap') > trimmed.lastIndexOf('\n');
  }

  /**
   * Determines the encoding of a file from the two most common encodings by trying
   * to decode it then looking for encoding errors
   *
   * @private
   */
  static detectFileEncoding(buffer) {
    if (buffer.length < 1) return false;
    let buf = (buffer.length < 4096 ? buffer : buffer.slice(0, 4096));

    const encodings = ['utf8', 'utf16le'];

    let encoding = encodings.find(
      (x) => !FileChangedCache.containsControlCharacters(buf.toString(x)));

    return encoding;
  }

  /**
   * Determines whether a string is likely to be poorly encoded by looking for
   * control characters above a certain threshold
   *
   * @private
   */
  static containsControlCharacters(str) {
    let controlCount = 0;
    let spaceCount = 0;
    let threshold = 2;
    if (str.length > 64) threshold = 4;
    if (str.length > 512) threshold = 8;

    for (let i=0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c === 65536 || c < 8) controlCount++;
      if (c > 14 && c < 32) controlCount++;
      if (c === 32) spaceCount++;

      if (controlCount > threshold) return true;
    }

    if (spaceCount < threshold) return true;

    if (controlCount === 0) return false;
    return (controlCount / str.length) < 0.02;
  }
}
