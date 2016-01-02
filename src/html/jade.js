import _ from 'lodash';
import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/jade'];
let jade = null;

export default class JadeCompiler extends SimpleCompilerBase {
  constructor() {
    super();
    this.compilerOptions.sourceMap = true;
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    jade = jade || require('jade');

    let code = jade.render(
      sourceCode,
      _.extend({ filename: filePath, cache: false }, this.compilerOptions));

    return { code, mimeType: 'text/html' };
  }
  
  getCompilerVersion() {
    return require('jade/package.json').version;
  }
}
