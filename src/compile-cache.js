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
    const digestObj = {
      version: compiler.getCompilerVersion,
      options: compiler.compilerOptions
    };
    
    let newCachePath = path.join(cachePath, createDigestForObject(digestObj));
    mkdirp.sync(newCachePath);
    
    return new CompileCache(newCachePath, fileChangeCache);
  }
  
  async get(filePath) {
    let hashInfo = await this.fileChangeCache.getHashForPath(path.resolve(filePath));
    
    let code = null;
    let mimeType = null;
    try {
      let buf = await pfs.readFile(path.join(this.cachePath, hashInfo.hash));
      let str = (await pzlib.gunzip(buf)).toString('utf8');
    
      let result = JSON.parse(str);
      code = result.code;   mimeType = result.mimeType;
      
    } catch (e) {
      // TODO: visionmedia/debug
      console.log(`Failed to read cache for ${filePath}`);
    }
    
    return { hashInfo, code, mimeType };
  }

  async save(hashInfo, code, mimeType) {
    let buf = await pzlib.gzip(new Buffer(JSON.stringify({code, mimeType})));
    
    await pfs.writeFile(
      path.join(this.cachePath, hashInfo.hash), 
      buf);
  }
  
  async getOrFetch(filePath, fetcher) {
    let {hashInfo, code, mimeType} = await this.get(filePath);
    if (code) return { hashInfo, code, mimeType};
    
    let result = await fetcher(filePath, hashInfo) || { hashInfo };
    
    if (result.code && result.mimeType) {
      await this.save(hashInfo, result.code, result.mimeType);
    }
    
    result.hashInfo = hashInfo;
    return result;
  }
  
  getSync(filePath) {
    let hashInfo = this.fileChangeCache.getHashForPathSync(path.resolve(filePath));
    
    let code = null;
    let mimeType = null;
    try {
      let buf = fs.readFileSync(path.join(this.cachePath, hashInfo.hash));
      let str = (zlib.gunzipSync(buf)).toString('utf8');
      let result = JSON.parse(str);
      code = result.code;   mimeType = result.mimeType;
      
    } catch (e) {
      // TODO: visionmedia/debug
      console.log(`Failed to read cache for ${filePath}`);
    }
    
    return { hashInfo, code, mimeType };  
  }

  saveSync(hashInfo, code, mimeType) {
    let buf = zlib.gzipSync(new Buffer(JSON.stringify({code, mimeType})));
    
    fs.writeFileSync(
      path.join(this.cachePath, hashInfo.hash), 
      buf);  
  }
  
  getOrFetchSync(filePath, fetcherSync) {
    let {hashInfo, code, mimeType} = this.getSync(filePath);
    if (code) return { hashInfo, code, mimeType};
    
    let result = fetcherSync(filePath, hashInfo) || { hashInfo };
    
    if (result && result.code && result.mimeType) {
      this.saveSync(hashInfo, result.code, result.mimeType);
    }
    
    result.hashInfo = hashInfo;
    return result;  
  }
}
