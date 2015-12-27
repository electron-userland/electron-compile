import path from 'path';
import {SimpleCompilerBase} from './compiler-base';
import mimeTypes from 'mime-types';

const inputMimeTypes = ['text/plain'];

export default class PassthroughCompiler extends SimpleCompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    return {
      code: sourceCode,
      mimeType: mimeTypes.lookup(filePath)
    };
  }
  
  getCompilerVersion() {
    return require(path.join(__dirname, 'package.json')).version;
  }
}
