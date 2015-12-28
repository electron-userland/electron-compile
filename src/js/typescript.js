import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/typescript'];
let tss = null;

export default class TypeScriptCompiler extends SimpleCompilerBase {
  constructor() {
    super();
    this.compilerOptions.sourceMap = true;

    this.compilerOptions = {
      module: 'commonjs',
      sourceMap: true
    };
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    tss = tss || require('typescript-simple');
    let compiler = new tss.TypeScriptSimple(this.compilerOptions);

    return {
      code: compiler.compile(sourceCode, filePath),
      mimeType: 'text/javascript'
    };
  }

  getCompilerVersion() {
    return require('typescript-simple/package.json').version;
  }
}
