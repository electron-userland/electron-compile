import {SimpleCompilerBase} from '../compiler-base';
import path from 'path';
import sorcery from 'sorcery';
import jsEscape from 'js-string-escape';

const inputMimeTypes = ['text/typescript', 'text/tsx'];
const d = require('debug')('electron-compile:typescript-compiler');

let ts = null;
let istanbul = null;

const builtinKeys = ['hotModuleReload', 'coverage', 'babel'];

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
      let opts = Object.assign({}, this.compilerOptions);
      let builtinOpts = {};
      builtinKeys.forEach((k) => {
        if (k in this.compilerOptions) {
          delete opts[k];
          builtinOpts[k] = this.compilerOptions[k];
        }
      });

      const results = tsCompiler.convertCompilerOptionsFromJson(opts);

      if (results.errors && results.errors.length) {
        throw new Error(JSON.stringify(results.errors));
      }

      parsedConfig = this.parsedConfig = { typescriptOpts: results.options, builtinOpts };
    }

    return parsedConfig;
  }

  compileSync(sourceCode, filePath) {
    ts = ts || require('typescript');
    const options = this._getParsedConfigOptions(ts);

    const isTsx = filePath.match(/\.tsx$/i);
    const transpileOptions = {
      compilerOptions: options.typescriptOpts,
      fileName: filePath.match(/\.(ts|tsx)$/i) ? path.basename(filePath) : null
    };

    if (isTsx && options.builtinOpts.hotModuleReload !== false) {
      sourceCode = this.addHotModuleLoadingRegistration(sourceCode, filePath, this.getExportsForFile(sourceCode, filePath, options.typescriptOpts));
    }

    let output = ts.transpileModule(sourceCode, transpileOptions);
    let sourceMaps = output.sourceMapText ? output.sourceMapText : null;
    if (options.builtinOpts.coverage) {
      sourceMaps = null;
      istanbul = istanbul || require('istanbul');

      sourceMaps = null;
      output.outputText = (new istanbul.Instrumenter()).instrumentSync(output.outputText, filePath);
    }

    d(JSON.stringify(output.diagnostics));

    const babelOpts = this.parsedConfig.builtinOpts.babel;
    if (babelOpts) {
      if (!this.babel) {
        const BabelCompiler = require("./babel").default;
        this.babel = new BabelCompiler();
        this.babel.compilerOptions = babelOpts;
      }
      if (!this.sorcery) {
        this.sorcer = require("sorcery");
      }
      let tsOutputPath = filePath.replace(/.tsx?$/i, ".js");
      let babelOutputPath = filePath.replace(/.tsx?$/i, ".babel.js");

      output.outputText = output.outputText.replace(/\/\/# sourceMap.*/g, "");

      let babelOutput = this.babel.compileSync(output.outputText, tsOutputPath);
      let chain = sorcery.loadSync(babelOutputPath, {
        content: {
          [filePath]: sourceCode,
          [tsOutputPath]: output.outputText,
          [babelOutputPath]: babelOutput.code,
        },
        sourcemaps: {
          [tsOutputPath]: JSON.parse(sourceMaps),
          [babelOutputPath]: JSON.parse(babelOutput.sourceMaps),
        }
      });
      let finalSourceMaps = chain.apply();
      let outputCode = babelOutput.code + "\n//# sourceMappingURL=" + finalSourceMaps.toUrl();

      // the only way to make sourceMaps usable seems to be to have
      // them inlined right now, see https://github.com/electron/electron-compile/issues/172#issuecomment-277146112
      return {
        code: outputCode,
        mimeType: babelOutput.mimeType,
      };
    }

    return {
      code: output.outputText,
      mimeType: this.outMimeType,
      sourceMaps
    };
  }

  addHotModuleLoadingRegistration(sourceCode, fileName, exports) {
    if (exports.length < 1) return sourceCode;

    let registrations = exports.map(x => {
      let id = `${x}` == 'default' ? '(typeof _default !== \'undefined\' ? _default : exports.default)' : `${x}`
      let name = `"${x}"`
      return `__REACT_HOT_LOADER__.register(${id}, ${name}, __FILENAME__);\n`
    });

    let tmpl = `
${sourceCode}

if (typeof __REACT_HOT_LOADER__ !== 'undefined') {
  const __FILENAME__ = "${jsEscape(fileName)}";
  ${registrations}
}`;

    return tmpl;
  }

  getExportsForFile(sourceCode, fileName, tsOptions) {
    let sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.ES6);
    let ret = [];

    // Walk the tree to search for classes
    let visit = (node) => {
      if (!this.isNodeExported(node)) return;
      
      if (node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.FunctionDeclaration) {
        ret.push(node.name.text);
      }
    };

    ts.forEachChild(sourceFile, visit);

    return ret;
  }

  isNodeExported(node) {
    return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
  }

  getCompilerVersion() {
    return require('typescript/package.json').version;
  }
}
