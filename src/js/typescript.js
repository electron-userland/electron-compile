import {SimpleCompilerBase} from '../compiler-base';
import path from 'path';

const inputMimeTypes = ['text/typescript', 'text/tsx'];
let tss = null;
let ts = null;

/**
 * @access private
 */
export default class TypeScriptCompiler extends SimpleCompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      module: 'commonjs',
      sourceMap: true,
      doSemanticChecks: true
    };
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    tss = tss || require('typescript-simple');
    ts = ts || require('typescript');

    // NB: If you enable semantic checks with TSX, you're gonna have a
    //     Bad Time
    let extraOpts = {target: ts.ScriptTarget.ES6};
    let isJsx = false;
    let isTs = filePath.match(/\.ts$/i);

    if (filePath.match(/\.tsx$/i)) {
      extraOpts.jsx = ts.JsxEmit.React;
      isJsx = true;
    }

    // NB: Work around TypeScriptSimple modifying the options object
    let compiler = new tss.TypeScriptSimple(
      Object.assign({}, this.compilerOptions, extraOpts),
      this.compilerOptions.doSemanticChecks && !isJsx);

    // NB: If we pass a filePath that is not a TypeScript file (i.e. we are
    // compiling the script block inside a Vue component), TypeScript will barf
    // attempting to find this file, even when it has a fully-qualified path.
    let code;
    if (isTs) {
      code = compiler.compile(sourceCode, path.basename(filePath));
    } else {
      code = compiler.compile(sourceCode);
    }

    return { code, mimeType: 'application/javascript' };
  }

  getCompilerVersion() {
    return require('typescript/package.json').version;
  }
}
