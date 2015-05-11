'use babel';

import _ from 'lodash';
import CompileCache from './compile-cache';

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
    this.ensureTs();
    return tss.compile(sourceCode, filePath);
  }
  
  shouldCompileFile() {
    this.ensureTs();
    return true;
  }
  
  ensureTs() {
    if (!tss) {
      const {TypeScriptSimple} = require('typescript-simple');
      tss = new TypeScriptSimple(this.compilerInformation, false);
      
      this.compilerInformation.version = require('typescript-simple/package.json').version;
    }
  }
}
