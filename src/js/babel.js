import _ from 'lodash';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/jsx', 'application/javascript'];
let babel = null;

export default class BabelCompiler extends CompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return mimeTypes;
  }

  async shouldCompileFile(fileName, compilerContext) {
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext) {
    return [];
  }

  async compile(sourceCode, filePath, compilerContext) {
    babel = babel || require('babel-core');

    let opts = _.extend({}, this.compilerOptions, {
      filename: filePath,
      ast: false
    });

    return {
      code: babel.transform(sourceCode, opts).code,
      mimeType: 'application/javascript'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    babel = babel || require('babel-core');

    let opts = _.extend({}, this.compilerOptions, {
      filename: filePath,
      ast: false
    });

    return {
      code: babel.transform(sourceCode, opts).code,
      mimeType: 'application/javascript'
    };
  }

  getCompilerVersion() {
    return require('babel-core/package.json').version;
  }
}
