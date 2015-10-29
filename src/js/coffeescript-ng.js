import CompilerBase from '../compiler-base';
import _ from 'lodash';

const inputMimeTypes = ['text/coffeescript'];

export class CoffeescriptCompiler extends SimpleCompilerBase {
  constructor() {
    super(inputMimeTypes);
    this.compilerOptions.sourceMap = true;
  }
  
  static getCompiler() {
    return inputMimeTypes;
  }
  
  compileSync(sourceCode, filePath, compilerContext) {
    let {js, v3SourceMap} = coffee.compile(
      sourceCode, 
      _.extend({ filename: filePath }, this.compilerOptions));

    js = `${js}\n` +
      `//# sourceMappingURL=data:application/json;base64,${btoa(unescape(encodeURIComponent(v3SourceMap)))}\n` +
      `//# sourceURL=${this.convertFilePath(filePath)}`;

    return {
      code: js,
      mimeType: 'text/javascript',
    };
  }
    
  convertFilePath(filePath) {
    if (process.platform === 'win32') {
      filePath = `/${path.resolve(filePath).replace(/\\/g, '/')}`;
    }

    return encodeURI(filePath);
  }
}
