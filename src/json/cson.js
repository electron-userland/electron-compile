import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/cson'];
let CSON = null;

/**
 * @access private
 */
export default class CSONCompiler extends SimpleCompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    CSON = CSON || require('cson');

    let jsonStr = CSON.parse(sourceCode);
    
    return {
      code: jsonStr,
      mimeType: 'application/json'
    };
  }

  getCompilerVersion() {
    return require('cson/package.json').version;
  }
}
