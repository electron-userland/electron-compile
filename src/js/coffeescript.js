import _ from 'lodash';
import path from 'path';
import btoa from 'btoa';

import CompileCache from '../compile-cache';

let coffee = null;

export default class CoffeeScriptCompiler extends CompileCache {
  constructor(options={}) {
    super();

    this.compilerInformation = _.extend({}, {
      extension: 'coffee',
    }, options);
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode, filePath) {
    let {js, v3SourceMap} = coffee.compile(sourceCode, { filename: filePath, sourceMap: true });

    js = `${js}\n` +
      `//# sourceMappingURL=data:application/json;base64,${btoa(unescape(encodeURIComponent(v3SourceMap)))}\n` +
      `//# sourceURL=${this.convertFilePath(filePath)}`;

    return js;
  }

  getMimeType() { return 'text/javascript'; }

  initializeCompiler() {
    coffee = require('coffee-script');
    return require('coffee-script/package.json').version;
  }

  convertFilePath(filePath) {
    if (process.platform === 'win32') {
      filePath = `/${path.resolve(filePath).replace(/\\/g, '/')}`;
    }

    return encodeURI(filePath);
  }
}
