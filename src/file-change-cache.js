import fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import pify from 'pify';
import _ from 'lodash';

const pfs = pify(fs);
const pzlib = pify(zlib);

export default class FileChangedCache {
  constructor(appRoot, failOnCacheMiss=false) {
    this.appRoot = appRoot;
    this.failOnCacheMiss = failOnCacheMiss;
    this.changeCache = {};
  }

  static async loadFromFile(file, failOnCacheMiss=true) {
    let ret = new FileChangedCache(failOnCacheMiss);
    let buf = await pfs.readFile(file);
    
    ret.changeCache = JSON.parse(await pzlib.gunzip(buf));
    return ret;
  }
  
  async getHashForPath(absoluteFilePath) {
    let cacheKey = this.appRoot ? absoluteFilePath.replace(this.appRoot, '') : absoluteFilePath;
    let cacheEntry = this.changeCache[cacheKey];
    
    if (this.failOnCacheMiss) {
      if (!cacheEntry) throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
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
      
      delete this.changeCache.cacheEntry;
    }
    
    let {digest, sourceCode} = await this.calculateHashForFile(absoluteFilePath);
    
    let info = {
      hash: digest,
      isMinified: FileChangedCache.contentsAreMinified(sourceCode),
      isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
      hasSourceMap: FileChangedCache.hasSourceMap(sourceCode)
    };
    
    this.changeCache[cacheKey] = { ctime, size, info };
    return _.extend({sourceCode}, info);
  }

  getHashForPathSync(absoluteFilePath) {
    // NB: Don't ever make patches to this method, patch the async version then re-port it
    // (i.e. every 'await', remove the await and add 'Sync' to the method call name)
    let cacheKey = this.appRoot ? absoluteFilePath.replace(this.appRoot, '') : absoluteFilePath;
    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
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

      delete this.changeCache.cacheEntry;
    }

    let {digest, sourceCode} = this.calculateHashForFileSync(absoluteFilePath);

    let info = {
      hash: digest,
      isMinified: FileChangedCache.contentsAreMinified(sourceCode),
      isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
      hasSourceMap: FileChangedCache.hasSourceMap(sourceCode)
    };

    this.changeCache[cacheKey] = { ctime, size, info };
    return _.extend({sourceCode}, info);
  }

  async save(filePath) {
    let buf = await pzlib.gzip(new Buffer(JSON.stringify(this.changeCache)));
    await pfs.writeFile(filePath, buf);
  }
  
  async calculateHashForFile(absoluteFilePath) {
    let sourceCode = await pfs.readFile(absoluteFilePath, 'utf8');
    let digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');
    
    return {sourceCode, digest};
  }
    
  calculateHashForFileSync(absoluteFilePath) {
    let sourceCode = pfs.readFileSync(absoluteFilePath, 'utf8');
    let digest = crypto.createHash('sha1').update(sourceCode, 'utf8').digest('hex');
    
    return {sourceCode, digest};
  }
  
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

  static isInNodeModules(filePath) {
    return !!(filePath.match(/[\\\/]node_modules[\\\/]/i) || filePath.match(/[\\\/]atom\.asar/));
  }

  static hasSourceMap(sourceCode) {
    return sourceCode.lastIndexOf('//# sourceMap') > sourceCode.lastIndexOf('\n');
  }
}
