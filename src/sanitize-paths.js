import fs from 'fs';
import LRUCache from 'lru-cache';

const d = require('debug-electron')('electron-compile:sanitize-paths');
const realpathCache = LRUCache({ max: 32 });

function cachedRealpath(p) {
  let ret = realpathCache.get(p);
  if (ret) return ret;

  ret = fs.realpathSync(p);
  d(`Cache miss for cachedRealpath: '${p}' => '${ret}'`);

  realpathCache.set(p, ret);
  return ret;
}

/**
 * Electron will sometimes hand us paths that don't match the platform if they
 * were derived from a URL (i.e. 'C:/Users/Paul/...'), whereas the cache will have
 * saved paths with backslashes.
 *
 * @private
 */
export default function sanitizeFilePath(file) {
  if (!file) return file;

  // NB: Some people add symlinks into system directories. node.js will internally
  // call realpath on paths that it finds, which will break our cache resolution.
  // We need to catch this scenario and fix it up. The tricky part is, some parts
  // of Electron will give us the pre-resolved paths, and others will give us the
  // post-resolved one. We need to handle both.

  let realFile = null;
  let parts = file.split(/[\\\/]app.asar[\\\/]/);
  if (!parts[1]) {
    // Not using an ASAR archive
    realFile = cachedRealpath(file);
  } else {
    // We do all this silliness to work around
    // https://github.com/atom/electron/issues/4610
    realFile = `${cachedRealpath(parts[0])}/app.asar/${parts[1]}`;
  }

  return realFile.replace(/[\\\/]/g, '/');
}
