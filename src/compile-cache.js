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
    let hashInfo = this.fileChangeCache(path.resolve(filePath));
    
    let code = null;
    try {
      let buf = await pfs.readFile(path.join(this.cachePath, hashInfo.hash));
      code = (await pzlib.gunzip(buf)).toString('utf8');
    } catch (e) {
      // TODO: visionmedia/debug
      console.log(`Failed to read cache for ${filePath}`);
    }
    
    return { hashInfo, code };
  }

  async save(hashInfo, content) {
    await pfs.writeFile(
      path.join(this.cachePath, hashInfo.hash), 
      zlib.gzip(new Buffer(content)));
  }
  
  getSync(filePath) {
    // NB: Never modify this method directly! Always copy-pasta from
    // get() and re-port it.
    let hashInfo = this.fileChangeCache(path.resolve(filePath));
    
    let code = null;
    try {
      let buf = fs.readFileSync(path.join(this.cachePath));
      code = (zlib.gunzipSync(buf)).toString('utf8');
    } catch (e) {
      // TODO: visionmedia/debug
      console.log(`Failed to read cache for ${filePath}`);
    }
    
    return { hashInfo, code };  
  }
  
  saveSync(hashInfo, content) {
    pfs.writeFileSync(
      path.join(this.cachePath, hashInfo.hash), 
      zlib.gzipSync(new Buffer(content)));
  }
}
