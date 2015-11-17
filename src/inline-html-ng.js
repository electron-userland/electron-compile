import _ from 'lodash';
import path from 'path';
import mimeTypes from 'mime-types';
import {CompilerBase} from './compiler-base';

const inputMimeTypes = ['text/html'];
let cheerio = null;

export default class InlineHtmlCompiler extends CompilerBase {
  constructor(compileBlock, compileBlockSync) {
    super();

    this.compileBlock = compileBlock;
    this.compileBlockSync = compileBlockSync;
  }

  static createFromCompilers(compilersByMimeType) {
    let compileBlock = async (sourceCode, filePath, mimeType, ctx) => {
      let realType = mimeType;
      if (!mimeType && ctx.tag === 'script') realType = 'text/javascript';

      if (!realType) return sourceCode;

      let Klass = compilersByMimeType[realType];
      if (!Klass) return sourceCode;
      if (Klass === InlineHtmlCompiler) return sourceCode;

      let compiler = new Klass();
      let ext = mimeTypes.extension(realType);
      let fakeFile = `${filePath}:inline_${ctx.count}.${ext}`;

      if (!(await compiler.shouldCompileFile(fakeFile, ctx))) return sourceCode;
      return (await compiler.compileSync(sourceCode, fakeFile, ctx)).code;
    };

    let compileBlockSync = (sourceCode, filePath, mimeType, ctx) => {
      let realType = mimeType;
      if (!mimeType && ctx.tag === 'script') realType = 'text/javascript';

      if (!realType) return sourceCode;

      let Klass = global.compilersByMimeType[realType];
      if (!Klass) return sourceCode;
      if (Klass === InlineHtmlCompiler) return sourceCode;

      let compiler = new Klass();
      let ext = mimeTypes.extension(realType);
      let fakeFile = `${filePath}:inline_${ctx.count}.${ext}`;

      if (!compiler.shouldCompileFileSync(fakeFile, ctx)) return sourceCode;
      return compiler.compileSync(sourceCode, fakeFile, ctx).code;
    };

    return new InlineHtmlCompiler(compileBlock, compileBlockSync);
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

  async each(nodes, selector) {
    let acc = [];
    nodes.each((i, el) => {
      let promise = selector(i,el);
      if (!promise) return false;

      acc.push(promise);
      return true;
    });

    await Promise.all(acc);
  }

  eachSync(nodes, selector) {
    // NB: This method is here just so it's easier to mechanically
    // translate the async compile to compileSync
    return nodes.each((i,el) => {
      selector(i,el);
      return true;
    });
  }

  async compile(sourceCode, filePath, compilerContext) {
    cheerio = cheerio || require('cheerio');
    let $ = cheerio.load(sourceCode);
    let toWait = [];

    let that = this;
    toWait.push(this.each($('style'), async (i, el) => {
      let mimeType = $(el).attr('type');

      $(el).text(await that.compileBlock($(el).text(), filePath, mimeType, 'style'));
      $(el).attr('type', 'text/css');
    }));

    toWait.push(this.each($('script'), async (i, el) => {
      let src = $(el).attr('src');
      if (src && src.length > 2) {
        $(el).attr('src', InlineHtmlCompiler.fixupRelativeUrl(src));
        return;
      }

      let mimeType = $(el).attr('type');

      $(el).text(await that.compileBlock($(el).text(), filePath, mimeType, 'script'));
      $(el).attr('type', 'application/javascript');
    }));

    $('link').map((i, el) => {
      let href = $(el).attr('href');
      if (href && href.length > 2) { $(el).attr('href', InlineHtmlCompiler.fixupRelativeUrl(href)); }
    });

    $('x-require').map((i, el) => {
      let src = $(el).attr('src');

      // File URL? Bail
      if (src.match(/^file:/i)) return;

      // Absolute path? Bail.
      if (src.match(/^([\/]|[A-Za-z]:)/i)) return;

      try {
        $(el).attr('src', path.resolve(path.dirname(filePath), src));
      } catch (e) {
        $(el).text(`${e.message}\n${e.stack}`);
      }
    });

    await Promise.all(toWait);

    return {
      code: $.html(),
      mimeType: 'text/html'
    };
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    cheerio = cheerio || require('cheerio');
    let $ = cheerio.load(sourceCode);

    let that = this;
    this.eachSync($('style'), (i, el) => {
      let mimeType = $(el).attr('type');

      $(el).text(that.compileBlockSync($(el).text(), filePath, mimeType, 'style'));
      $(el).attr('type', 'text/css');
    });

    this.eachSync($('script'), (i, el) => {
      let src = $(el).attr('src');
      if (src && src.length > 2) {
        $(el).attr('src', InlineHtmlCompiler.fixupRelativeUrl(src));
        return;
      }

      let mimeType = $(el).attr('type');

      $(el).text(that.compileBlockSync($(el).text(), filePath, mimeType, 'script'));
      $(el).attr('type', 'application/javascript');
    });

    $('link').map((i, el) => {
      let href = $(el).attr('href');
      if (href && href.length > 2) { $(el).attr('href', InlineHtmlCompiler.fixupRelativeUrl(href)); }
    });

    $('x-require').map((i, el) => {
      let src = $(el).attr('src');

      // File URL? Bail
      if (src.match(/^file:/i)) return;

      // Absolute path? Bail.
      if (src.match(/^([\/]|[A-Za-z]:)/i)) return;

      try {
        $(el).attr('src', path.resolve(path.dirname(filePath), src));
      } catch (e) {
        $(el).text(`${e.message}\n${e.stack}`);
      }
    });

    return {
      code: $.html(),
      mimeType: 'text/html'
    };
  }

  getCompilerVersion() {
    let thisVersion = require('../package.json').version;
    let otherVersions = _.map(this.allCompilers, (x) => x.getCompilerVersion).join();

    return `${thisVersion},${otherVersions}`;
  }

  static fixupRelativeUrl(url) {
    if (!url.match(/^\/\//)) return url;
    return `https:${url}`;
  }
}
