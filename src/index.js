import CompileCache from './compile-cache';
import CompilerHost from './compiler-host';
import * as configParser from './config-parser';
import FileChangedCache from './file-change-cache';
import {addBypassChecker} from './protocol-hook';

// NB: Patch a bug in Electron that affects electron-prebuilt-compile that
// we can't fix any other way. Yes it _does_ feelbadman.jpg
const fs = require('fs');
fs.statSyncNoException = fs.statSyncNoException || ((...args) => {
  try {
    return fs.statSync(...args);
  } catch (e) {
    return null;
  }
});

let enableLiveReload = null;
let watchPath = null;

module.exports = Object.assign({
  // NB: delay-load live-reload so we don't load RxJS in production
  enableLiveReload: function(...args) {
    enableLiveReload = enableLiveReload || require('./live-reload').enableLiveReload;
    return enableLiveReload(...args);
  },
  watchPath: function(...args) {
    watchPath = watchPath || require('./pathwatcher-rx').watchPath;
    return watchPath(...args);
  },
},
  configParser,
  { CompilerHost, FileChangedCache, CompileCache, addBypassChecker }
);
