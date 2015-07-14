import _ from 'lodash';
import path from 'path';
import CompileCache from 'electron-compile-cache';

let scss = null;

const scssFileExtensions = /\.(sass|scss)$/i;
const extensions = ['scss', 'sass'];

export default class ScssCompiler extends CompileCache {
  constructor(options={}) {
    super();

    const defaultOptions = {
      sourceComments: true,
      sourceMapEmbed: true,
      sourceMapContents: true,
    };

    const requiredOptions = {
      extensions: extensions
    };

    this.compilerInformation = _.extend(defaultOptions, options, requiredOptions);
  }
  
  static getExtensions() {
    return extensions;
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode, filePath) {
    let paths = Object.keys(this.seenFilePaths);
    paths.unshift('.');

    let opts = _.extend({}, this.compilerInformation, {
      data: sourceCode,
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,
      includePaths: paths,
      filename: path.basename(filePath)
    });

    let result = scss.renderSync(opts);
    return result.toString('utf8');
  }

  getMimeType() { return 'text/css'; }

  register() {}

  initializeCompiler() {
    scss = require('node-sass');
    return require('node-sass/package.json').version;
  }
}
