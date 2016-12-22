import path from 'path';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/sass', 'text/scss'];
let sass = null;

/**
 * @access private
 */
export default class SassCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourceComments: true,
      sourceMapEmbed: true,
      sourceMapContents: true
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
    return [];
  }

  async compile(sourceCode, filePath, compilerContext) {
    sass = sass || require('@paulcbetts/node-sass');

    let thisPath = path.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    paths.unshift('.');

    let opts = Object.assign({}, this.compilerOptions, {
      data: sourceCode,
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,		
      includePaths: paths,
      filename: path.basename(filePath)
    });

    let result = await new Promise((res,rej) => {
      sass.render(opts, (e,r) => {
        if (e) { rej(e); } else { res(r); }
      });
    });

    return {
      code: result.css.toString('utf8'),
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
    sass = sass || require('@paulcbetts/node-sass');

    let thisPath = path.dirname(filePath);
    this.seenFilePaths[thisPath] = true;

    let paths = Object.keys(this.seenFilePaths);

    if (this.compilerOptions.paths) {
      paths.push(...this.compilerOptions.paths);
    }

    paths.unshift('.');

    let opts = Object.assign({}, this.compilerOptions, {
      data: sourceCode,
      indentedSyntax: filePath.match(/\.sass$/i),
      sourceMapRoot: filePath,		
      includePaths: paths,
      filename: path.basename(filePath)
    });

    let result = sass.renderSync(opts);

    return {
      code: result.css.toString('utf8'),
      mimeType: 'text/css'
    };
  
  }

  getCompilerVersion() {
    // NB: There is a bizarre bug in the node module system where this doesn't 
    // work but only in saveConfiguration tests
    //return require('@paulcbetts/node-sass/package.json').version;
    return "4.1.1";
  }
}
