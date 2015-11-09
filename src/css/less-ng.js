import _ from 'lodash';
import path from 'path';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/less'];
let lessjs = null;

export default class LessCompilerNext extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      compress: false,
      sourcemap: { sourcemapfileinline: true }
    };
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

  async compile(sourceCode, filePath, compilerContext) {
    lessjs = lessjs || require('less');

    let paths = Object.keys(this.seenFilePaths);
    paths.unshift('.');

    this.seenFilePaths[path.dirname(filePath)] = true;

    let opts = _.extend({}, this.compilerInformation, {
      paths: paths,
      filename: path.basename(filePath)
    });

    let result = await lessjs.render(sourceCode, opts);

    return {
      code: result.css,
      mimeType: 'text/css'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    let source = '';
    let error = null;

    let paths = Object.keys(this.seenFilePaths);
    paths.unshift('.');
    this.seenFilePaths[path.dirname(filePath)] = true;

    let opts = _.extend({}, this.compilerInformation, {
      paths: paths,
      filename: path.basename(filePath),
      fileAsync: false, async: false, syncImport: true
    });

    lessjs.render(sourceCode, opts, (err, out) => {
      if (err) {
        error = err;
      } else {
        // NB: Because we've forced less to work in sync mode, we can do this
        source = out.css;
      }
    });

    if (error) {
      throw error;
    }

    return {
      code: source,
      mimeType: 'text/css'
    };
  }

  getCompilerVersion() {
    return require('less/package.json').version;
  }
}
