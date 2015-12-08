import path from 'path';
import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/plain'];

export default class PassthroughCompiler extends SimpleCompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode) {
    return {
      code: sourceCode,
      mimeType: 'text/plain'
    };
  }
  
  getCompilerVersion() {
    return require(path.join(__dirname, 'package.json')).version;
  }
}
