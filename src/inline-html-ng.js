import _ from 'lodash';
import mimeTypes from 'mime-types';
import path from 'path';
import {CompilerBase} from '../compiler-base';

const mimeTypes = ['text/html'];
let cheerio = null;

export class InlineHtmlCompiler extends CompilerBase {
  constructor(compileBlockSync) {
    this.compilerOptions = {};
    this.compileBlockSync = compileBlockSync;
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
    cheerio = cheerio || require('cheerio');
    let $ = cheerio.load(sourceCode);

    $('style').map((i, el) => {
      let mimeType = $(el).attr('type') || 'text/css';
      if (!mimeType || mimeType.length < 2) {
        return;
      }

      let path = `${filePath}:inline_${i}.${mimeTypes.extension(mimeType)}`;
      let originalCode = $(el).text();

      $(el).text(this.compileBlockSync(originalCode, path) || originalCode);
      $(el).attr('type', 'text/css');
    });

    $('script').map((i, el) => {
      let src = $(el).attr('src');
      if (src && src.length > 2) {
        $(el).attr('src', this.fixupRelativeUrl(src));
        return;
      }

      let mimeType = $(el).attr('type') || 'application/javascript';
      let path = `${filePath}:inline_${i}.${mimeTypes.extension(mimeType)}`;

      let originalCode = $(el).text();

      $(el).text(this.compileBlockSync(originalCode, path) || originalCode);
      $(el).attr('type', 'application/javascript');
    });

    $('link').map((i, el) => {
      let href = $(el).attr('href');
      if (href && href.length > 2) { $(el).attr('href', this.fixupRelativeUrl(href)); }
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

    return $.html();
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }

  compileSync(sourceCode, filePath, compilerContext) {
    cheerio = cheerio || require('cheerio');
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
