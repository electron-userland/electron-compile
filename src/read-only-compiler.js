import CompileCache from 'electron-compile-cache';

export default class ReadOnlyCompiler extends CompileCache {
  constructor(compilerInformation, mimeType) {
    super();
    
    this.compilerInformation = compilerInformation;
    this.mimeType = mimeType;
  }

  getCompilerInformation() {
    return this.compilerInformation;
  }

  compile(sourceCode, filePath, cachePath) {
    throw new Error(`Asked to compile ${filePath} in production!`);
  }

  getMimeType() {
    return this.mimeType;
  }

  initializeCompiler() {
    return this.compilerInformation.version;
  }

  static getExtensions() {
    return [];
  }
}
