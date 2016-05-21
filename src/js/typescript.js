import {SimpleCompilerBase} from '../compiler-base';
import _ from 'lodash';

const inputMimeTypes = ['text/typescript'];
let tss = null;

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
    
    // NB: Work around TypeScriptSimple modifying the options object
    let compiler = new tss.TypeScriptSimple(_.assign({}, this.compilerOptions), this.compilerOptions.doSemanticChecks);

    return {
      code: compiler.compile(sourceCode, filePath),
      mimeType: 'application/javascript'
    };
  }

  getCompilerVersion() {
    return require('typescript-simple/package.json').version;
  }
}
