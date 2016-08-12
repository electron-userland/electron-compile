import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/typescript', 'text/tsx'];
let tss = null;
let ts = null;

/**
 * @access private
 */ 
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
    ts = ts || require('typescript');
    
    let extraOpts = {target: ts.ScriptTarget.ES6};
    if (filePath.match(/\.tsx$/i)) {
      extraOpts.jsx = ts.JsxEmit.Preserve;
    }
    
    // NB: Work around TypeScriptSimple modifying the options object
    let compiler = new tss.TypeScriptSimple(Object.assign({}, this.compilerOptions), this.compilerOptions.doSemanticChecks);

    return {
      code: compiler.compile(sourceCode, filePath),
      mimeType: 'application/javascript'
    };
  }

  getCompilerVersion() {
    return require('typescript/package.json').version;
  }
}
