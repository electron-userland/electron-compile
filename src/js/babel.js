import path from 'path';
import fs from 'fs';
import os from 'os';
import detective from 'detective-es6';
import resolve from 'resolve';
import appModulePath from 'app-module-path';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/jsx', 'application/javascript'];
let babel = null;

let natives = process.binding('natives');

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
    return this.determineDependentFilesSync(sourceCode, filePath, compilerContext);
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
    const sourceMapObject = output.map;

    let sourceMaps;
    if (sourceMapObject) {
      sourceMapObject.sourcesContent && delete sourceMapObject.sourcesContent;
      sourceMaps = JSON.stringify(sourceMapObject);
    }

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

  walkUntilPackageJsonFound(directory) {
    let up = path.resolve(directory, '../');
    let packageDotJson = path.resolve(up, 'package.json');
    let exists = fs.existsSync(packageDotJson);

    if (exists) {
      return directory
    }

    let rt = (os.platform == "win32") ? directory.split(path.sep)[0] : "/"

    if (rt === directory) {
      return false
    }

    return this.walkUntilPackageJsonFound(up)
  }

  resolvePartial(partial, filePath) {
    let dir = path.dirname(filePath)

    let packageJsonDirectory = this.walkUntilPackageJsonFound(dir)

    if (packageJsonDirectory === false) {
      return false
    }

    let nodeModules = path.resolve(packageJsonDirectory, 'node_modules/')

    // add their node_modules to the list of resolution paths
    appModulePath.addPath(nodeModules);

    let result = resolve.sync(partial, {
      basedir: dir,
      extensions: [ '.js', '.jsx' ]
    });

    return result
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    let dependencyPartials = detective(sourceCode)
    let dependencies = []

    for (let dependencyPartial of dependencyPartials) {
      
      if (natives[dependencyPartial]) { 
        continue
      }

      let absolute = this.resolvePartial(dependencyPartial, filePath);

      if (absolute === false) { // obviously invalid?
        continue
      }

      dependencies.push(absolute);
    }

    return dependencies;
  }

  compileSync(sourceCode, filePath, compilerContext) {
    return this.transformCode(sourceCode, filePath);
  }

  getCompilerVersion() {
    return require('babel-core/package.json').version;
  }
}
