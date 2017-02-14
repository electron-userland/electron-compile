import path from 'path';
import detective from 'detective-stylus';
import lookup from 'stylus-lookup';
import {CompilerBase} from '../compiler-base';
import {basename} from 'path';

const mimeTypes = ['text/stylus'];

let stylusjs = null;
let nib = null;

function each(obj, sel) {
  for (let k in obj) {
    sel(obj[k], k);
  }
}

/**
 * @access private
 */
export default class StylusCompiler extends CompilerBase {
  constructor() {
    super();

    this.compilerOptions = {
      sourcemap: 'inline',
      import: ['nib']
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
    nib = nib || require('nib');
    stylusjs = stylusjs || require('stylus');
    this.seenFilePaths[path.dirname(filePath)] = true;

    let opts = this.makeOpts(filePath);

    let code = await new Promise((res,rej) => {
      let styl = stylusjs(sourceCode, opts);

      this.applyOpts(opts, styl);

      styl.render((err, css) => {
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
    let opts = Object.assign({}, this.compilerOptions, {
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
  
  
  applyOpts(opts, stylus) {
    each(opts, (val, key) => {
      switch(key) {
      case 'set':
      case 'define':
        each(val, (v, k) => stylus[key](k, v));
        break;
      case 'include':
      case 'import':
      case 'use':
        each(val, (v) => stylus[key](v));
        break;
      }
    });

    stylus.set('paths', Object.keys(this.seenFilePaths).concat(['.']));
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    let dependencyFilenames = detective(sourceCode);
    let dependencies = [];

    for (let dependencyName of dependencyFilenames) {
      dependencies.push(lookup(dependencyName, path.basename(filePath), path.dirname(filePath)));
    }

    return dependencies;
  }

  compileSync(sourceCode, filePath, compilerContext) {
    nib = nib || require('nib');
    stylusjs = stylusjs || require('stylus');
    this.seenFilePaths[path.dirname(filePath)] = true;

    let opts = this.makeOpts(filePath), styl = stylusjs(sourceCode, opts);

    this.applyOpts(opts, styl);

    return {
      code: styl.render(),
      mimeType: 'text/css'
    };
  }

  getCompilerVersion() {
    return require('stylus/package.json').version;
  }
}
