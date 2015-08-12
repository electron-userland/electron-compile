'use babel';

import CompileCache from 'electron-compile-cache';
import cheerio from 'cheerio';
import path from 'path';

const extensions = ['html', 'htm'];

const mimeTypeToExtension = {
  'text/less': 'less',
  'text/scss': 'scss',
  'text/sass': 'sass',
  'application/javascript': 'js',
  'application/coffeescript': 'coffee',
  'application/typescript': 'ts'
};

export default class InlineHtmlCompiler extends CompileCache {
  constructor(compileMethod) {
    super();
    
    this.innerCompile = compileMethod;
    this.compilerInformation = { extensions: extensions };
  }
  
  static getExtensions() {
    return extensions;
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode, filePath) {
    let $ = cheerio.load(sourceCode);
    
    $('style').map((i, el) => {
      let mimeType = $(el).attr('type');
      let path = `${filePath}:inline_${i}.${this.getExtensionFromMimeType(mimeType, 'style')}`;
      
      $(el).text("\n" + this.innerCompile($(el).text(), path) + "\n");
      $(el).attr('type', 'text/css');
    });
    
    $('script').map((i, el) => {
      let src = $(el).attr('src');
      if (src && src.length > 2) return;
      
      let mimeType = $(el).attr('type');
      let path = `${filePath}:inline_${i}.${this.getExtensionFromMimeType(mimeType, 'script')}`;
      
      $(el).text(this.innerCompile($(el).text(), path));
      $(el).attr('type', 'application/javascript');
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

  getMimeType() { return 'text/html'; }

  register() {}

  initializeCompiler() {
    // XXX: Ugh, this is terrible but close enough
    return require('../package.json').version;
  }
  
  getExtensionFromMimeType(mimeType, tagType) {
    let defaultType = (tagType === 'style' ? 'less' : 'js');
    
    if (!mimeType || mimeType.length < 2) return defaultType;
    return mimeTypeToExtension[mimeType] || defaultType;
  }
}
