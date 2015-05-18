'use babel';

import _ from 'lodash';
import path from 'path';
import btoa from 'btoa';

import CompileCache from '../compile-cache';

let coffee = null;

export default class CoffeeScriptCompiler extends CompileCache {
  constructor(options={}) {
    super();
    
    this.compilerInformation = _.extend({}, {
      extension: 'coffee',
    }, options);
  }
    
  getCompilerInformation() {
    return this.compilerInformation;
  }
  
  compile(sourceCode, filePath) {
    this.ensureCoffee();
    let {js, v3SourceMap} = coffee.compile(sourceCode, { filename: filePath, sourceMap: true });
    
    js = `${js}\n` +
      `//# sourceMappingURL=data:application/json;base64,${btoa(unescape(encodeURIComponent(v3SourceMap)))}\n` +
      `//# sourceURL=${this.convertFilePath(filePath)}`;
      
    return js;
  }
  
  getMimeType() { return 'text/javascript'; }
  
  shouldCompileFile(sourceCode, fullPath) {
    let ret = super.shouldCompileFile(sourceCode, fullPath);
    if (!ret) return ret;
    
    this.ensureCoffee();
    return ret;
  }
  
  ensureCoffee() {
    if (!coffee) {
      coffee = require('coffee-script');
      this.compilerInformation.version = require('coffee-script/package.json').version;
    }
  }
  
  convertFilePath(filePath) {
    if (process.platform === 'win32') {
      filePath = `/${path.resolve(filePath).replace(/\\/g, '/')}`;
    }
      
    return encodeURI(filePath);
  }
}
