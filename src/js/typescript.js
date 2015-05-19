'use babel';

import _ from 'lodash';
import CompileCache from '../compile-cache';

let tss = null;

export default class TypeScriptCompiler extends CompileCache {
  constructor(options={}) {
    super();

    this.compilerInformation = _.extend({}, {
      extension: 'ts',
      target: 1,
      module: 'commonjs',
      sourceMap: true
    }, options);
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode, filePath) {
    return tss.compile(sourceCode, filePath);
  }

  getMimeType() { return 'text/javascript'; }

  initializeCompiler() {
    const {TypeScriptSimple} = require('typescript-simple');
    tss = new TypeScriptSimple(this.compilerInformation, false);

    return require('typescript-simple/package.json').version;
  }
}
