import _ from 'lodash';
import CompileCache from './compile-cache';

let babel = null;

const validOpts = ['sourceMap', 'blacklist', 'stage', 'optional'];

export default class BabelCompiler extends CompileCache {
  constructor(options={}) {
    super();
    
    this.compilerInformation = _.extend({}, options, {
      extension: 'js',
      sourceMap: 'inline',
      blacklist: [
        'useStrict'
      ],
      stage: 1,
      optional: [
        // Target a version of the regenerator runtime that
        // supports yield so the transpiled code is cleaner/smaller.
        'asyncToGenerator'
      ],
    });
    
  }
    
  getCompilerInformation() {
    return this.compilerInformation;
  }
  
  compile(sourceCode) {
    this.ensureBabel();
    this.babelCompilerOpts = this.babelCompilerOpts || _.pick(this.compilerInformation, validOpts);
    
    return babel.transform(sourceCode, this.babelCompilerOpts).code;
  }
  
  shouldCompileFile(sourceCode) {
    this.ensureBabel();
    return /^("use babel"|'use babel'|"use babel"|'use babel')/.test(sourceCode);
  }
  
  ensureBabel() {
    if (!babel) {
      babel = require('babel-core');
      this.compilerInformation.version = babel.version;
    }
  }
}
