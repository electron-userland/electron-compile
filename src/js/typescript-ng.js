import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/typescript'];
let tss = null;

export default class TypeScriptCompilerNext extends SimpleCompilerBase {
  constructor() {
    super();
    this.compilerOptions.sourceMap = true;

    this.compilerOptions = {
      target: 1,
      module: 'commonjs',
      sourceMap: true
    };
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    tss = tss || require('typescript-simple');

    return {
      code: tss.compile(sourceCode, filePath),
      mimeType: 'text/javascript'
    };
  }

  getCompilerVersion() {
    return require('typescript-simple/package.json').version;
  }
}
