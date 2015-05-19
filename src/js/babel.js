import _ from 'lodash';
import CompileCache from '../compile-cache';

let babel = null;

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

  shouldCompileFile(sourceCode, filePath) {
    let ret = super.shouldCompileFile(sourceCode, filePath);
    if (!ret) return;

    return ret && !(/^("use nobabel"|'use nobabel')/.test(sourceCode));
  }

  initializeCompiler() {
    babel = require('babel-core');
    return babel.version;
  }
}
