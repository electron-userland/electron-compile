import pify from 'pify';
import fs from 'fs';
import zlib from 'zlib';

const pfs = pify(fs);
const pzlib = pify(zlib);

export default class FileChangedCache {
  constructor(failOnCacheMiss) {
    this.failOnCacheMiss = failOnCacheMiss;
    this.changeCache = {};
  }

  static async loadFromFile(file, failOnCacheMiss=true) {
    let ret = new FileChangedCache(failOnCacheMiss);
    let buf = await pfs.readFile(file);
    
    ret.changeCache = JSON.parse(await pzlib.gunzip(buf));
  }

  getHashForPath(filePath) {
  }

  getHashForPathSync(filePath) {
  }

  async save(filePath) {
    let buf = await pzlib.gzip(new Buffer(JSON.stringify(this.changeCache)));
    await pfs.writeFile(filePath, buf);
  }
  
  static async isMinified(filePath) {
    let fd = await pfs.open(filePath, 'r');
    
    try {
      let buf = new Buffer(4096);
      let len = await pfs.read(fd, buf, 0, 4096, null);
      
      return FileChangedCache.contentsAreMinified(buf.toString('utf8', 0, len));
    } finally {
      fs.closeSync(fd);
    }
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
    // If we're in node_modules or in Electron core code, we're gonna punt
    if (filePath.match(/[\\\/]node_modules[\\\/]/i) || filePath.match(/[\\\/]atom\.asar/)) return false;
  }

  static hasSourceMap(filePath) {
    return false;
  }
}
