import * as configParser from './config-parser';

import CompilerHost from './compiler-host';
import FileChangedCache from './file-change-cache';
import CompileCache from './compile-cache';
import {enableLiveReload} from './live-reload';

module.exports = Object.assign({},
  configParser,
  enableLiveReload,
  { CompilerHost, FileChangedCache, CompileCache }
);
