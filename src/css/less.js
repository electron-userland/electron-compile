'use babel';

import _ from 'lodash';
import path from 'path';
import CompileCache from 'electron-compile-cache';

let lessjs = null;
const extensions = ['less'];

export default class LessCompiler extends CompileCache {
  constructor(options={}) {
    super();

    const defaultOptions = {
      compress: false,
      sourcemap: { sourcemapfileinline: true }
    };

    const requiredOptions = {
      extensions: extensions,
      fileAsync: false, async: false, syncImport: true
    };

    this.compilerInformation = _.extend(defaultOptions, options, requiredOptions);
  }
  
  static getExtensions() {
    return extensions;
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode, filePath) {
    let source = '';
    let error = null;
    let paths = Object.keys(this.seenFilePaths);
    paths.unshift('.');

    let opts = _.extend({}, this.compilerInformation, {
      paths: paths,
      filename: path.basename(filePath)
    });

    lessjs.render(sourceCode, opts, (err, out) => {
      if (err) {
        error = err;
      } else {
        // NB: Because we've forced less to work in sync mode, we can do this
        source = out.css;
      }
    });

    if (error) {
      throw error;
    }

    return source;
  }

  getMimeType() { return 'text/css'; }

  register() {}

  initializeCompiler() {
    lessjs = require('less');
    return require('less/package.json').version;
  }
}
