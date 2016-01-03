/**
 * This class is the base interface for compilers that are used by 
 * electron-compile. If your compiler library only supports a 
 * synchronous API, use SimpleCompilerBase instead.
 *
 * @interface
 */ 
export class CompilerBase {
  constructor() {
    this.compilerOptions = {};
  }
  
  /**  
   * This method describes the MIME types that your compiler supports as input. 
   * Many precompiled file types don't have a specific MIME type, so if it's not
   * recognized by the mime-types package, you need to patch rig-mime-types in
   * electron-compile.
   *
   * @return {string[]}  An array of MIME types that this compiler can compile.
   *
   * @abstract
   */   
  static getInputMimeTypes() {
    throw new Error("Implement me!");
  }


  /**
   * Determines whether a file should be compiled
   *    
   * @param  {string} fileName        The full path of a file to compile.
   * @param  {object} compilerContext An object that compilers can add extra
                                    information to as part of a job - the caller
                                    won't do anything with this.
   * @return {Promise<bool>}        True if you are able to compile this file.
   *
   * @abstract
   */   
  async shouldCompileFile(fileName, compilerContext) {
    throw new Error("Implement me!");
  }

  
  /**  
   * Returns the dependent files of this file. This is used for languages such
   * as LESS which allow you to import / reference other related files. In future
   * versions of electron-compile, we will use this information to invalidate
   * all of the parent files if a child file changes.
   *    
   * @param  {string} sourceCode    The contents of filePath
   * @param  {string} fileName        The full path of a file to compile.
   * @param  {object} compilerContext An object that compilers can add extra
                                    information to as part of a job - the caller
                                    won't do anything with this.
   * @return {Promise<string[]>}    An array of dependent file paths, or an empty
   *                                array if there are no dependent files. 
   *
   * @abstract
   */   
  async determineDependentFiles(sourceCode, fileName, compilerContext) {
    throw new Error("Implement me!");
  }

  
  /**  
   * Compiles the file
   *    
   * @param  {string} sourceCode    The contents of filePath
   * @param  {string} fileName      The full path of a file to compile.
   * @param  {object} compilerContext An object that compilers can add extra
                                    information to as part of a job - the caller
                                    won't do anything with this.
   * @return {Promise<object>}      An object representing the compiled result
   * @property {string} code        The compiled code
   * @property {string} mimeType    The MIME type of the compiled result, which 
   *                                should exist in the mime-types database.
   *
   * @abstract
   */   
  async compile(sourceCode, fileName, compilerContext) {
    throw new Error("Implement me!");
  }

  shouldCompileFileSync(fileName, compilerContext) {
    throw new Error("Implement me!");
  }

  determineDependentFilesSync(sourceCode, fileName, compilerContext) {
    throw new Error("Implement me!");
  }

  compileSync(sourceCode, fileName, compilerContext) {
    throw new Error("Implement me!");
  }

  /**
   * Returns a version number representing the version of the underlying 
   * compiler library. When this number changes, electron-compile knows
   * to throw all away its generated code.
   *    
   * @return {string}  A version number. Note that this string isn't 
   *                   parsed in any way, just compared to the previous
   *                   one for equality.
   *
   * @abstract
   */   
  getCompilerVersion() {
    throw new Error("Implement me!");
  }
}


/**
 * This class implements all of the async methods of CompilerBase by just 
 * calling the sync version. Use it to save some time when implementing 
 * simple compilers.
 *
 * To use it, implement the compile method, the getCompilerVersion method, 
 * and the getInputMimeTypes static method. 
 * 
 * @abstract
 */ 
export class SimpleCompilerBase extends CompilerBase {
  constructor() {
    super();
  }

  async shouldCompileFile(fileName, compilerContext) {
    return true;
  }

  async determineDependentFiles(sourceCode, filePath, compilerContext) {
    return [];
  }

  async compile(sourceCode, filePath, compilerContext) {
    return this.compileSync(sourceCode, filePath, compilerContext);
  }

  shouldCompileFileSync(fileName, compilerContext) {
    return true;
  }

  determineDependentFilesSync(sourceCode, filePath, compilerContext) {
    return [];
  }
}
