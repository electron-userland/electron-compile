import {CompilerBase} from '../compiler-base';
import extend from 'lodash/object/extend';
import {basename} from 'path';
import nib from 'nib';
import path from 'path';

const mimeTypes = ['text/stylus'];
let stylusjs = null;

/**
 * @access private
 */
export default class StylusCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourcemap: true
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
    stylusjs = stylusjs || require('stylus');

    let opts = this.makeOpts(filePath);

    let code = await new Promise((res,rej) => {
      stylusjs.render(sourceCode, opts, (err, css) => {
        if (err) {
          rej(err);
        } else {
          res(css);
        }
      });
    });

    return {
      code, mimeType: 'text/css'
    };
  }

  makeOpts(filePath) {
    let opts = extend({}, this.compilerOptions, {
      filename: basename(filePath)
    });

    if (opts.import && !Array.isArray(opts.import)) {
      opts.import = [opts.import];
    }

    if (opts.import && opts.import.indexOf('nib') >= 0) {
      opts.use = opts.use || [];

      if (!Array.isArray(opts.use)) {
        opts.use = [opts.use];
      }

      opts.use.push(nib());
    }

    return opts;
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    stylusjs = stylusjs || require('stylus');

    let opts = this.makeOpts(filePath);

    return {
      code: stylusjs.render(sourceCode, opts),
      mimeType: 'text/css'
    };
  }

  getCompilerVersion() {
    return require('stylus/package.json').version;
  }
}
