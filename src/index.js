import './babel-maybefill';

import * as configParser from './config-parser';

import CompilerHost from './compiler-host';
import FileChangedCache from './file-change-cache';
import CompileCache from './compile-cache';

module.exports = Object.assign({},
  configParser,
  { CompilerHost, FileChangedCache, CompileCache }
);
