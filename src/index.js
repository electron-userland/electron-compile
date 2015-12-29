import _ from 'lodash';

import configParser from './config-parser';

import CompilerHost from './compiler-host';
import FileChangedCache from './file-change-cache';
import CompileCache from './compile-cache';

module.exports = _.assign({},
  configParser,
  { CompilerHost, FileChangedCache, CompileCache }
);
