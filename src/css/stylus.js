import {CompilerBase} from '../compiler-base';
import path from 'path';

const mimeTypes = ['text/stylus'];
let stylusjs = null;

/**
 * @access private
 */
export default class StylusCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourcemap: true
    };
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
    stylusjs = stylusjs || require('stylus');

    let opts = Object.assign({}, this.compilerOptions, {
      filename: path.basename(filePath)
    });

    let code = await new Promise((res,rej) => {
      stylusjs.render(sourceCode, opts, (err, css) => {
        if (err) {
          rej(err);
        } else {
          res(css);
        }
      });
    });

    return {
      code, mimeType: 'text/css'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    stylusjs = stylusjs || require('stylus');

    let opts = Object.assign({}, this.compilerOptions, {
      filename: path.basename(filePath)
    });

    return {
      code: stylusjs.render(sourceCode, opts),
      mimeType: 'text/css'
    };
  }

  getCompilerVersion() {
    return require('stylus/package.json').version;
  }
}
