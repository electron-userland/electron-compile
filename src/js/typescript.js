import {SimpleCompilerBase} from '../compiler-base';
import path from 'path';
import jsEscape from 'js-string-escape';

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
        throw new Error(JSON.stringify(results.errors));
      }
      parsedConfig = this.parsedConfig = results.options;
    }
    return parsedConfig;
  }

  compileSync(sourceCode, filePath) {
    ts = ts || require('typescript');
    const options = this._getParsedConfigOptions(ts);

    const isTsx = filePath.match(/\.tsx$/i);
    const transpileOptions = {
      compilerOptions: options,
      fileName: filePath.match(/\.(ts|tsx)$/i) ? path.basename(filePath) : null
    };

    if (isTsx) {
      sourceCode = this.addHotModuleLoadingRegistration(sourceCode, filePath, this.getExportsForFile(filePath, options));
    }

    const output = ts.transpileModule(sourceCode, transpileOptions);
    const sourceMaps = output.sourceMapText ? output.sourceMapText : null;

    d(JSON.stringify(output.diagnostics));

    return {
      code: output.outputText,
      mimeType: this.outMimeType,
      sourceMaps
    };
  }

  addHotModuleLoadingRegistration(sourceCode, fileName, exports) {
    if (exports.length < 1) return sourceCode;

    let registrations = exports.map(x => 
      `__REACT_HOT_LOADER__.register(${x}, "${x}", __FILENAME__);\n`
    );

    let tmpl = `
${sourceCode}

if (__REACT_HOT_LOADER__) {
  const __FILENAME__ = "${jsEscape(fileName)}";
  ${registrations}
}`;

    return tmpl;
  }

  getExportsForFile(fileName, tsOptions) {
    let pg = ts.createProgram([fileName], tsOptions);
    let c = pg.getTypeChecker();
    let ret = [];

    // Walk the tree to search for classes
    let visit = (node) => {
      if (!this.isNodeExported(node)) return;
      
      if (node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.FunctionDeclaration) {
        ret.push(c.getSymbolAtLocation(node.name).getName());
      }
    };

    let filePathWithForwardSlashes = fileName.replace(/[\\]/g, '/');
    for (const sourceFile of pg.getSourceFiles()) {
      if (sourceFile.fileName !== filePathWithForwardSlashes) {
        continue;
      }
      
      ts.forEachChild(sourceFile, visit);
    }

    return ret;
  }

  isNodeExported(node) {
    return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
  }

  getCompilerVersion() {
    return require('typescript/package.json').version;
  }
}
