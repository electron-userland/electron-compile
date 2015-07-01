import _ from 'lodash';
import CompileCache from '../compile-cache';
import fs from 'fs';

let babel = require('babel-core');

const validOpts = ['sourceMap', 'blacklist', 'stage', 'optional'];

export default class BabelCompiler extends CompileCache {
  constructor(options={}) {
    super();

    this.compilerInformation = _.extend({}, {
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
    }, options);
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode) {
    this.babelCompilerOpts = this.babelCompilerOpts || _.pick(this.compilerInformation, validOpts);
    return babel.transform(sourceCode, this.babelCompilerOpts).code;
  }

  getMimeType() { return 'text/javascript'; }

  shouldCompileFile(filePath) {
    let ret = super.shouldCompileFile(filePath);
    if (!ret) return false;
    
    // Read the first 4k of the file
    let fd = fs.openSync(filePath, 'r');
    let sourceCode = '';
    
    try {
      let buf = new Buffer(4*1024);
      fs.readSync(fd, buf, 0, 4*1024, 0);
      sourceCode = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }

    return ret && !(/^("use nobabel"|'use nobabel')/.test(sourceCode));
  }

  initializeCompiler() {
    babel = require('babel-core');
    return babel.version;
  }
}
