'use babel';

import _ from 'lodash';
import path from 'path';
import CompileCache from '../compile-cache';

let lessjs = null;

const lessFileExtensions = /\.less$/i;

export default class LessCompiler extends CompileCache {
  constructor(options={}) {
    super();
    
    const defaultOptions = {
      compress: false, 
      sourcemap: { sourcemapfileinline: true }
    };
    
    const requiredOptions = { 
      extension: 'less',
      fileAsync: false,
      async: false
    };
    
    this.compilerInformation = _.extend(defaultOptions, options, requiredOptions);
  }
    
  getCompilerInformation() {
    return this.compilerInformation;
  }
  
  compile(sourceCode, filePath) {
    this.ensureLess();
    
    let source = '';
    let paths = Object.keys(this.seenFilePaths);
    paths.unshift('.');
    
    let opts = _.extend({}, this.compilerInformation, {
      paths: paths,
      filename: path.basename(filePath)
    });
    
    lessjs.render(sourceCode, opts, (err, out) => {
      // NB: Because we've forced less to work in sync mode, we can do this
      if (err) throw err;
      source = out.css;
    });
    
    return source;
  }
  
  getMimeType() { return 'text/css'; }
  
  shouldCompileFile(sourceCode, fullPath) {
    let ret = super.shouldCompileFile(sourceCode, fullPath);
    if (!ret) return ret;
    
    this.ensureLess();
    return ret;
  }
  
  register() {}
  
  ensureLess() {
    if (!lessjs) {
      lessjs = require('less');
      this.compilerInformation.version = require('less/package.json').version;
    }
  }
}
