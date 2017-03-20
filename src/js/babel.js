import path from 'path';
import {SimpleCompilerBase} from '../compiler-base';

const mimeTypes = ['text/jsx', 'application/javascript'];
let babel = null;
let istanbul = null;

export default class BabelCompiler extends SimpleCompilerBase {
  constructor() {
    super();
  }

  static getInputMimeTypes() {
    return mimeTypes;
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

  compileSync(sourceCode, filePath, compilerContext) {
    babel = babel || require('babel-core');

    let opts = Object.assign({}, this.compilerOptions, {
      filename: filePath,
      ast: false,
      babelrc: false
    });

    let useCoverage = false;
    if ('coverage' in opts) {
      useCoverage = !!opts.coverage;
      delete opts.coverage;
    }

    if ('plugins' in opts) {
      let plugins = this.attemptToPreload(opts.plugins, 'plugin');
      if (plugins && plugins.length === opts.plugins.length) opts.plugins = plugins;
    }

    if ('presets' in opts) {
      let presets = this.attemptToPreload(opts.presets, 'preset');
      if (presets && presets.length === opts.presets.length) opts.presets = presets;
    }

    const output = babel.transform(sourceCode, opts);
    let sourceMaps = output.map ? JSON.stringify(output.map) : null;

    let code = output.code;
    if (useCoverage) {
      istanbul = istanbul || require('istanbul');

      sourceMaps = null;
      code = (new istanbul.Instrumenter()).instrumentSync(output.code, filePath);
    }

    return { code, sourceMaps, mimeType: 'application/javascript', };
  }

  getCompilerVersion() {
    return require('babel-core/package.json').version;
  }
}
