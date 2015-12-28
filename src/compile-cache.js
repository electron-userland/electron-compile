import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import createDigestForObject from './digest-for-object';
import pify from 'pify';
import mkdirp from 'mkdirp';

const pfs = pify(fs);
const pzlib = pify(zlib);
const d = require('debug')('electron-compile:compile-cache');

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
        name: compiler.name || Object.getPrototypeOf(compiler).constructor.name,
        version: compiler.getCompilerVersion(),
        options: compiler.compilerOptions
      };

      newCachePath = path.join(cachePath, createDigestForObject(digestObj));

      d(`Path for ${digestObj.name}: ${newCachePath}`);
      d(`Set up with parameters: ${JSON.stringify(digestObj)}`);
      mkdirp.sync(newCachePath);
      return newCachePath;
    };
    
    let ret = new CompileCache('', fileChangeCache);
    ret.getCachePath = getCachePath;
    
    return ret;
  }
  
  async get(filePath) {
    d(`Fetching ${filePath} from cache`);
    let hashInfo = await this.fileChangeCache.getHashForPath(path.resolve(filePath));
  
    let code = null;
    let mimeType = null;
    let binaryData = null;
    let dependentFiles = null;
    
    try {
      let cacheFile = path.join(this.getCachePath(), hashInfo.hash);
      
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
      d(`Failed to read cache for ${filePath}: ${e.message}`);
    }
    
    return { hashInfo, code, mimeType, binaryData, dependentFiles };
  }

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
  
  async getOrFetch(filePath, fetcher) {
    let cacheResult = await this.get(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;
    
    let result = await fetcher(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };
    
    if (result.mimeType) {
      d(`Cache miss: saving out info for ${filePath}`);
      await this.save(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);
    }
    
    result.hashInfo = cacheResult.hashInfo;
    return result;
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
  
  getOrFetchSync(filePath, fetcherSync) {
    let cacheResult = this.getSync(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;
    
    let result = fetcherSync(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };
    
    if (result.mimeType) {
      d(`Cache miss: saving out info for ${filePath}`);
      this.saveSync(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);
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
