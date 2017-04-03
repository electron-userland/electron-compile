import * as configParser from './config-parser';

import CompilerHost from './compiler-host';
import FileChangedCache from './file-change-cache';
import CompileCache from './compile-cache';
//import {enableLiveReload} from './live-reload';
//import {watchPath} from './pathwatcher-rx';

let enableLiveReload = null;
let watchPath = null;

module.exports = Object.assign({
  // NB: delay-load live-reload so we don't load RxJS in production
  enableLiveReload: function() {
    enableLiveReload = enableLiveReload || require('./live-reload').enableLiveReload;
    return enableLiveReload(arguments);
  },
  watchPath: function() {
    watchPath = watchPath || require('./pathwatcher-rx').watchPath;
    return watchPath(arguments);
  },
},
  configParser,
  { CompilerHost, FileChangedCache, CompileCache }
);
