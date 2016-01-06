/**
 * Electron will sometimes hand us paths that don't match the platform if they
 * were derived from a URL (i.e. 'C:/Users/Paul/...'), whereas the cache will have
 * saved paths with backslashes.
 *  
 * @private
 */ 
export default function sanitizeFilePath(file) {
  let ret = file.replace(/[\\\/]/g, '/');
  return ret.toLowerCase();
}
