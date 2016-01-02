import _ from 'lodash';

export default class ReadOnlyCompiler {
  constructor(name, compilerVersion, compilerOptions, inputMimeTypes) {
    _.assign(this, { name, compilerVersion, compilerOptions, inputMimeTypes });
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
