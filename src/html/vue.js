import {CompilerBase} from '../compiler-base';
import toutSuite from 'toutsuite';

const inputMimeTypes = ['text/vue'];
let vueify = null;

const d = require('debug')('electron-compile:vue');

const mimeTypeToSimpleType = {
  'application/coffeescript': 'coffee',
  'application/typescript': 'ts',
  'text/jade': 'jade',
  'text/less': 'less',
  'text/sass': 'sass',
  'text/scss': 'scss',
  'text/stylus': 'stylus',
};

/**
 * @access private
 */
export default class VueCompiler extends CompilerBase {
  constructor(asyncCompilers, syncCompilers) {
    super();
    Object.assign(this, { asyncCompilers, syncCompilers });

    this.compilerOptions = {};
  }

  static createFromCompilers(compilersByMimeType) {
    d(`Setting up inline HTML compilers: ${JSON.stringify(Object.keys(compilersByMimeType))}`);

    let asyncCompilers = Object.keys(compilersByMimeType).reduce((acc, mimeType) => {
      let compiler = compilersByMimeType[mimeType];

      acc[mimeType] = async (content, cb, vueCompiler, filePath) => {
        let ctx = {};
        try {
          if (!await compiler.shouldCompileFile(filePath, ctx)) {
            cb(null, content);
            return;
          }

          let result = await compiler.compile(content, filePath, ctx);
          cb(null, result.code);
          return;
        } catch (e) {
          cb(e);
        }
      };

      let st = mimeTypeToSimpleType[mimeType];
      if (st) acc[st] = acc[mimeType];

      return acc;
    }, {});

    let syncCompilers = Object.keys(compilersByMimeType).reduce((acc, mimeType) => {
      let compiler = compilersByMimeType[mimeType];

      acc[mimeType] = (content, cb, vueCompiler, filePath) => {
        let ctx = {};
        try {
          if (!compiler.shouldCompileFileSync(filePath, ctx)) {
            cb(null, content);
            return;
          }

          let result = compiler.compileSync(content, filePath, ctx);
          cb(null, result.code);
          return;
        } catch (e) {
          cb(e);
        }
      };

      let st = mimeTypeToSimpleType[mimeType];
      if (st) acc[st] = acc[mimeType];

      return acc;
    }, {});

    return new VueCompiler(asyncCompilers, syncCompilers);
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  async shouldCompileFile(fileName, compilerContext) {
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext) {
    return [];
  }

  async compile(sourceCode, filePath, compilerContext) {
    vueify = vueify || require('@paulcbetts/vueify');

    let opts = Object.assign({}, this.compilerOptions);

    let code = await new Promise((res, rej) => {
      vueify.compiler.compileNoGlobals(sourceCode, filePath, this.asyncCompilers, opts, (e,r) => {
        if (e) { rej(e); } else { res(r); }
      });
    });

    return {
      code,
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
    vueify = vueify || require('@paulcbetts/vueify');

    let opts = Object.assign({}, this.compilerOptions);

    let err,code;
    toutSuite(() => {
      vueify.compiler.compileNoGlobals(sourceCode, filePath, this.syncCompilers, opts, (e,r) => {
        if (e) { err = e; } else { code = r; }
      });
    });

    if (err) throw err;

    return {
      code,
      mimeType: 'application/javascript'
    };
  }

  getCompilerVersion() {
    // NB: See same issue with SASS and user-scoped modules as to why we hard-code this
    let thisVersion = '9.4.0';
    let compilers = this.allCompilers || [];
    let otherVersions = compilers.map((x) => x.getCompilerVersion).join();

    return `${thisVersion},${otherVersions}`;
  }
}
