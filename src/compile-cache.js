import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import createDigestForObject from './digest-for-object';
import pify from 'pify';
import mkdirp from 'mkdirp';

const pfs = pify(fs);
const pzlib = pify(zlib);

export default class CompileCache {
  constructor(cachePath, fileChangeCache) {
    this.cachePath = cachePath;
    this.fileChangeCache = fileChangeCache;
  }
  
  static createFromCompiler(cachePath, compiler, fileChangeCache) {
    let newCachePath = null;
    let getCachePath = () => {
      if (newCachePath) return newCachePath;

      const digestObj = {
        version: compiler.getCompilerVersion,
        options: compiler.compilerOptions
      };

      newCachePath = path.join(cachePath, createDigestForObject(digestObj));
      mkdirp.sync(newCachePath);
      return newCachePath;
    };
    
    let ret = new CompileCache('', fileChangeCache);
    ret.getCachePath = getCachePath;
    
    return ret;
  }
  
  async get(filePath) {
    let hashInfo = await this.fileChangeCache.getHashForPath(path.resolve(filePath));
  
    let code = null;
    let mimeType = null;
    let binaryData = null;
    
    try {
      let cacheFile = path.join(this.getCachePath(), hashInfo.hash);
      
      let result = null;
      if (hashInfo.isFileBinary) {
        let infoJson = await pfs.readFile(cacheFile + '.info');
        mimeType = JSON.parse(infoJson).mimeType;
        
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
      }
    } catch (e) {
      // TODO: visionmedia/debug
      console.log(`Failed to read cache for ${filePath}`);
    }
    
    return { hashInfo, code, mimeType, binaryData };
  }

  async save(hashInfo, codeOrBinaryData, mimeType) {
    let buf = null;
    let target = path.join(this.getCachePath(), hashInfo.hash);
    
    if (hashInfo.isFileBinary) {
      buf = await pzlib.gzip(codeOrBinaryData);
      await pfs.writeFile(target + '.info', JSON.stringify({mimeType}), 'utf8');
    } else {
      buf = await pzlib.gzip(new Buffer(JSON.stringify({code: codeOrBinaryData, mimeType})));
    }
    
    await pfs.writeFile(target, buf);
  }
  
  async getOrFetch(filePath, fetcher) {
    let cacheResult = await this.get(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;
    
    let result = await fetcher(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };
    
    if (result.mimeType) {
      await this.save(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType);
    }
    
    result.hashInfo = cacheResult.hashInfo;
    return result;
  }
  
  getSync(filePath) {
    let hashInfo = this.fileChangeCache.getHashForPathSync(path.resolve(filePath));
  
    let code = null;
    let mimeType = null;
    let binaryData = null;
    
    try {
      let cacheFile = path.join(this.getCachePath(), hashInfo.hash);
      
      let result = null;
      if (hashInfo.isFileBinary) {
        let infoJson = fs.readFileSync(cacheFile + '.info');
        mimeType = JSON.parse(infoJson).mimeType;
        
        binaryData = hashInfo.binaryData;
        if (!binaryData) {
          binaryData = fs.readFileSync(cacheFile);
          binaryData = zlib.gunzipSync(binaryData);
        }
      } else {
        let buf = fs.readFileSync(cacheFile);
        let str = zlib.gunzipSync(buf).toString('utf8');

        result = JSON.parse(str);
        code = result.code;
        mimeType = result.mimeType;
      }
    } catch (e) {
      // TODO: visionmedia/debug
      console.log(`Failed to read cache for ${filePath}`);
    }
    
    return { hashInfo, code, mimeType, binaryData };
  }

  saveSync(hashInfo, codeOrBinaryData, mimeType) {
    let buf = null;
    let target = path.join(this.getCachePath(), hashInfo.hash);
    
    if (hashInfo.isFileBinary) {
      buf = zlib.gzipSync(codeOrBinaryData);
      fs.writeFileSync(target + '.info', JSON.stringify({mimeType}), 'utf8');
    } else {
      buf = zlib.gzipSync(new Buffer(JSON.stringify({code: codeOrBinaryData, mimeType})));
    }
    
    fs.writeFileSync(target, buf);
  }
  
  getOrFetchSync(filePath, fetcherSync) {
    let cacheResult = this.getSync(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;
    
    let result = fetcherSync(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };
    
    if (result.mimeType) {
      this.saveSync(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType);
    }
    
    result.hashInfo = cacheResult.hashInfo;
    return result;
  }

  getCachePath() {
    // NB: This is an evil hack so that createFromCompiler can stomp it
    // at will
    return this.cachePath;
  }
}
