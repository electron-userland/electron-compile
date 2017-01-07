import {SimpleCompilerBase} from '../compiler-base';
import path from 'path';

const inputMimeTypes = ['text/typescript', 'text/tsx'];
const d = require('debug')('electron-compile:typescript-compiler');

let ts = null;

/**
 * @access private
 */
export default class TypeScriptCompiler extends SimpleCompilerBase {
  constructor() {
    super();

    this.outMimeType = 'application/javascript';
    this.compilerOptions = {
      inlineSourceMap: true,
      inlineSources: true
    };
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  _getParsedConfigOptions(tsCompiler) {
    let parsedConfig = this.parsedConfig;
    if (!parsedConfig) {
      const results = tsCompiler.convertCompilerOptionsFromJson(this.compilerOptions);
      if (results.errors && results.errors.length) {
        throw new Error(results.errors);
      }
      parsedConfig = this.parsedConfig = results.options;
    }
    return parsedConfig;
  }

  compileSync(sourceCode, filePath) {
    ts = ts || require('typescript');
    const options = this._getParsedConfigOptions(ts);

    const transpileOptions = {
      compilerOptions: options,
      fileName: filePath.match(/\.(ts|tsx)$/i) ? path.basename(filePath) : null
    };

    const output = ts.transpileModule(sourceCode, transpileOptions);

    d(output.diagnostics);

    return {
      code: output.outputText,
      mimeType: this.outMimeType
    };
  }

  getCompilerVersion() {
    return require('typescript/package.json').version;
  }
}
