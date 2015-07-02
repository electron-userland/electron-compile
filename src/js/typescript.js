import _ from 'lodash';
import CompileCache from '../compile-cache';

let tss = null;
const extensions = ['ts'];

export default class TypeScriptCompiler extends CompileCache {
  constructor(options={}) {
    super();

    this.compilerInformation = _.extend({}, {
      extensions: extensions,
      target: 1,
      module: 'commonjs',
      sourceMap: true
    }, options);
  }
  
  static getExtensions() {
    return extensions;
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
