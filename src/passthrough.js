import path from 'path';
import {SimpleCompilerBase} from './compiler-base';
import mimeTypes from '@paulcbetts/mime-types';

const inputMimeTypes = ['text/plain', 'image/svg+xml'];


/**
 * @access private
 * 
 * This class is used for binary files and other files that should end up in 
 * your cache directory, but aren't actually compiled
 */ 
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
    return require(path.join(__dirname, '..', 'package.json')).version;
  }
}
