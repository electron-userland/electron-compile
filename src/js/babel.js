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
    if (!names.length) return null

    const fixupModule = (exp) => {
      // NB: Some plugins like transform-decorators-legacy, use import/export
      // semantics, and others don't
      if ('default' in exp) return exp['default'];
      return exp;
    };

    const nodeModulesAboveUs = path.resolve(__dirname, '..', '..', '..');

    const preloadStrategies = [
      x => fixupModule(require.main.require(x)),
      x => fixupModule(require(path.join(nodeModulesAboveUs, x))),
      x => fixupModule(require(x))
    ]

    const possibleNames = (name) => {
      let names = [`babel-${prefix}-${name}`];

      if (prefix === 'plugin') {
        // Look for module names that do not start with "babel-plugin-"
        names.push(name);
      }

      return names;
    };

    // Apply one preloading strategy to the possible names of a module, and return the preloaded
    // module if found, null otherwise
    const preloadPossibleNames = (name, strategy) => {
      if (typeof strategy !== 'function') return null;

      return possibleNames(name).reduce((mod, possibleName)=>{
        if (mod !== null) return mod;

        try {
          return strategy(possibleName);
        } catch(e) {}

        return null;
      }, null)
    }

    // Pick a loading strategy that finds the first plugin, the same strategy will be
    // used to preload all plugins
    const selectedStrategy = preloadStrategies.reduce((winner, strategy)=>{
      if (winner !== null) return winner;
      return preloadPossibleNames(names[0], strategy) === null ? null : strategy;
    }, null)

    return names.map(name => preloadPossibleNames(name, selectedStrategy)).filter((mod) => mod !== null)
  }

  compileSync(sourceCode, filePath, compilerContext) { // eslint-disable-line no-unused-vars
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
