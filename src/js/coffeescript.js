import path from 'path';
import btoa from 'btoa';
import {SimpleCompilerBase} from '../compiler-base';

const inputMimeTypes = ['text/coffeescript'];
let coffee = null;

/**
 * @access private
 */
export default class CoffeeScriptCompiler extends SimpleCompilerBase {
  constructor() {
    super();
    this.compilerOptions.sourceMap = true;
  }

  static getInputMimeTypes() {
    return inputMimeTypes;
  }

  compileSync(sourceCode, filePath) {
    coffee = coffee || require('coffee-script');

    let {js, v3SourceMap} = coffee.compile(
      sourceCode,
      Object.assign({ filename: filePath }, this.compilerOptions));

    js = `${js}\n` +
      `//# sourceMappingURL=data:application/json;base64,${btoa(unescape(encodeURIComponent(v3SourceMap)))}\n` +
      `//# sourceURL=${this.convertFilePath(filePath)}`;

    return {
      code: js,
      mimeType: 'application/javascript'
    };
  }

  convertFilePath(filePath) {
    if (process.platform === 'win32') {
      filePath = `/${path.resolve(filePath).replace(/\\/g, '/')}`;
    }

    return encodeURI(filePath);
  }

  getCompilerVersion() {
    return require('coffee-script/package.json').version;
  }
}
