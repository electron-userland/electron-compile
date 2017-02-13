import path from 'path';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/jsx', 'application/javascript'];
let babel = null;

/**
 * @access private
 */
export default class BabelCompiler extends CompilerBase {
  constructor() {
    super();
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

  // NB: This method exists to stop Babel from trying to load plugins from the
  // app's node_modules directory, which in a production app doesn't have Babel
  // installed in it. Instead, we try to load from our entry point's node_modules
  // directory (i.e. Grunt perhaps), and if it doesn't work, just keep going.
  attemptToPreload(names, prefix) {
    const fixupModule = (exp) => {
      // NB: Some plugins like transform-decorators-legacy, use import/export
      // semantics, and others don't
      if ('default' in exp) return exp['default'];
      return exp;
    };

    const preloadStrategies = [
      () => names.map((x) => fixupModule(require.main.require(`babel-${prefix}-${x}`))),
      () => {
        let nodeModulesAboveUs = path.resolve(__dirname, '..', '..', '..');
        return names.map((x) => fixupModule(require(path.join(nodeModulesAboveUs, `babel-${prefix}-${x}`))));
      },
      () => names.map((x) => fixupModule(require(`babel-${prefix}-${x}`)))
    ];

    for (let strategy of preloadStrategies) {
      try {
        return strategy();
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  transformCode(sourceCode, filePath) {
    babel = babel || require('babel-core');

    let opts = Object.assign({}, this.compilerOptions, {
      filename: filePath,
      ast: false,
      babelrc: false
    });

    if ('plugins' in opts) {
      let plugins = this.attemptToPreload(opts.plugins, 'plugin');
      if (plugins && plugins.length === opts.plugins.length) opts.plugins = plugins;
    }

    if ('presets' in opts) {
      let presets = this.attemptToPreload(opts.presets, 'preset');
      if (presets && presets.length === opts.presets.length) opts.presets = presets;
    }
    const output = babel.transform(sourceCode, opts);
    const sourceMaps = output.map ? JSON.stringify(output.map) : null;

    return {
      code: output.code,
      mimeType: 'application/javascript',
      sourceMaps
    };
  }

  async compile(sourceCode, filePath, compilerContext) {
    return this.transformCode(sourceCode, filePath);
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    return this.transformCode(sourceCode, filePath);
  }

  getCompilerVersion() {
    return require('babel-core/package.json').version;
  }
}
