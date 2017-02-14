import path from 'path';
import detective from 'detective-less';
import {CompilerBase} from '../compiler-base';
import toutSuite from 'toutsuite';

const mimeTypes = ['text/less'];
let lessjs = null;

/**
 * @access private
 */
export default class LessCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourceMap: { sourceMapFileInline: true }
    };

    this.seenFilePaths = {};
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

  async compile(sourceCode, filePath, compilerContext) {
    lessjs = lessjs || this.getLess();

    let thisPath = path.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    let opts = Object.assign({}, this.compilerOptions, {
      paths: paths,
      filename: path.basename(filePath)
    });

    let result = await lessjs.render(sourceCode, opts);
    let source = result.css;

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source && typeof source === 'string') {
      source = ' ';
    }

    return {
      code: source,
      mimeType: 'text/css'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    let dependencyFilenames = detective(sourceCode);
    let dependencies = [];

    for (let dependencyName of dependencyFilenames) {
      dependencies.push(path.join(path.dirname(filePath), dependencyName));
    }

    return dependencies;
  }

  compileSync(sourceCode, filePath, compilerContext) {
    lessjs = lessjs || this.getLess();

    let source;
    let error = null;

    let thisPath = path.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    let opts = Object.assign({}, this.compilerOptions, {
      paths: paths,
      filename: path.basename(filePath),
      fileAsync: false, async: false, syncImport: true
    });

    toutSuite(() => {
      lessjs.render(sourceCode, opts, (err, out) => {
        if (err) {
          error = err;
        } else {
          // NB: Because we've forced less to work in sync mode, we can do this
          source = out.css;
        }
      });
    });

    if (error) {
      throw error;
    }

    // NB: If you compile a file that is solely imports, its
    // actual content is '' yet it is a valid file. '' is not
    // truthy, so we're going to replace it with a string that
    // is truthy.
    if (!source && typeof source === 'string') {
      source = ' ';
    }

    return {
      code: source,
      mimeType: 'text/css'
    };
  }

  getLess() {
    let ret;
    toutSuite(() => ret = require('less'));
    return ret;
  }

  getCompilerVersion() {
    return require('less/package.json').version;
  }
}
