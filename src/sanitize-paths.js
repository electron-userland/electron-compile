//const d = require('debug')('electron-compile:sanitize-paths');

/**
 * Electron will sometimes hand us paths that don't match the platform if they
 * were derived from a URL (i.e. 'C:/Users/Paul/...'), whereas the cache will have
 * saved paths with backslashes.
 *  
 * @private
 */ 
export default function sanitizeFilePath(file) {
  // d(file);
  if (!file) return file;

  let ret = file.replace(/[\\\/]/g, '/');
  return ret.toLowerCase();
}
