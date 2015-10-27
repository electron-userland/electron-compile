import pify from 'pify';
const pfs = pify(require('fs'));

export default class FileChangedCache {
  constructor(failOnCacheMiss) {
  }

  static loadFromFile(file) {
  }

  getHashForPath(file) {
  }

  getHashForPathSync(file) {
  }

  save(file) {
  }

  static isMinified(source) {
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
