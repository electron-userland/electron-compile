import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/jade'];
let jade = null;

/**
 * @access private
 */ 
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
      Object.assign({ filename: filePath, cache: false }, this.compilerOptions));

    return { code, mimeType: 'text/html' };
  }
  
  getCompilerVersion() {
    return require('jade/package.json').version;
  }
}
