/**
 * ReadOnlyCompiler is a compiler which allows the host to inject all of the compiler
 * metadata information so that {@link CompileCache} et al are able to recreate the
 * hash without having two separate code paths.
 */ 
export default class ReadOnlyCompiler {
  /**  
   * Creates a ReadOnlyCompiler instance
   *    
   * @private
   */   
  constructor(name, compilerVersion, compilerOptions, inputMimeTypes) {
    Object.assign(this, { name, compilerVersion, compilerOptions, inputMimeTypes });
  }
  
  async shouldCompileFile() { return true; }
  async determineDependentFiles() { return []; }

  async compile() {
    throw new Error("Read-only compilers can't compile");
  }

  shouldCompileFileSync() { return true; }
  determineDependentFilesSync() { return []; }

  compileSync() {
    throw new Error("Read-only compilers can't compile");
  }

  getCompilerVersion() {
    return this.compilerVersion;
  }
}
