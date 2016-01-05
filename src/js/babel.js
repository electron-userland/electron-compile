import _ from 'lodash';
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
    try {
      return _.map(names, (x) => require.main.require(`babel-${prefix}-${x}`))
    } catch (e) {
      return null;
    }
  }

  async compile(sourceCode, filePath, compilerContext) {
    babel = babel || require('babel-core');

    let opts = _.extend({}, this.compilerOptions, {
      filename: filePath,
      ast: false
    });

    if ('plugins' in opts) {
      let plugins = this.attemptToPreload(opts.plugins, 'plugin');
      if (plugins) opts.plugins = plugins;
    }

    if ('presets' in opts) {
      let presets = this.attemptToPreload(opts.plugins, 'preset');
      if (presets) opts.presets = presets;
    }

    return {
      code: babel.transform(sourceCode, opts).code,
      mimeType: 'application/javascript'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    babel = babel || require('babel-core');

    let opts = _.extend({}, this.compilerOptions, {
      filename: filePath,
      ast: false
    });

    if ('plugins' in opts) {
      let plugins = this.attemptToPreload(opts.plugins, 'plugin');
      if (plugins) opts.plugins = plugins;
    }

    if ('presets' in opts) {
      let presets = this.attemptToPreload(opts.presets, 'preset');
      if (presets) opts.presets = presets;
    }

    d(`Final opts: ${JSON.stringify(opts)}`);
    return {
      code: babel.transform(sourceCode, opts).code,
      mimeType: 'application/javascript'
    };
  }

  getCompilerVersion() {
    return require('babel-core/package.json').version;
  }
}
