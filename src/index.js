import * as configParser from './config-parser';

import CompilerHost from './compiler-host';
import FileChangedCache from './file-change-cache';
import CompileCache from './compile-cache';
import {addBypassChecker} from './protocol-hook';
//import {enableLiveReload} from './live-reload';
//import {watchPath} from './pathwatcher-rx';

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
