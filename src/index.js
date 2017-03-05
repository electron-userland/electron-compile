import * as configParser from './config-parser';

import CompilerHost from './compiler-host';
import FileChangedCache from './file-change-cache';
import CompileCache from './compile-cache';
import {enableLiveReload} from './live-reload';
import {watchPath} from './pathwatcher-rx';
import {addBypassChecker} from './protocol-hook';

module.exports = Object.assign({},
  configParser,
  { enableLiveReload, watchPath, CompilerHost, FileChangedCache, CompileCache, addBypassChecker }
);
