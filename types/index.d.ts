export declare class CompilerHost {

    /**
     * Creates a development-mode CompilerHost from the previously saved configuration.
     */
    static createFromConfiguration(
        rootCacheDir: string, 
        appRoot: string, 
        compilersByMimeType: CompilersByMimeType, 
        fallbackCompiler: CompilerBase): PromiseLike<CompilerHost>;

    /**
     * Creates a development-mode CompilerHost from the previously saved configuration.
     */
    static createFromConfigurationSync(
        rootCacheDir: string, 
        appRoot: string, 
        compilersByMimeType: CompilersByMimeType, 
        fallbackCompiler: CompilerBase): CompilerHost;

    /**
     * Creates a production-mode CompilerHost from the previously saved configuration.
     */
    static createReadonlyFromConfiguration(
        rootCacheDir: string,
        appRoot: string,
        fallbackCompiler: CompilerBase): PromiseLike<CompilerHost>;

    /**
     * Creates a production-mode CompilerHost from the previously saved configuration.
     */    
    static createReadonlyFromConfigurationSync(
        rootCacheDir: string,
        appRoot: string, 
        fallbackCompiler: CompilerBase): CompilerHost

    constructor(
        rootCacheDir: string,
        compilers: CompilersByMimeType, 
        fileChangeCache: FileChangedCache, 
        readOnlyMode?: boolean, 
        fallbackCompiler?: CompilerBase);

    readonly appRoot: string;
    readonly cachesForCompilers: Map<string, CompilerBase>;

    compile(filePath: string): {
        hashinfo: {},
        code: string,
        binaryData: Buffer;
        mimeType: string;
        dependentFiles: string[];
    }

    /**
     * Pre-caches an entire directory of files recursively. Usually used for building custom compiler tooling.
     */
    compileAll(
        filePath: string,
        shouldCompile: (path: string) => boolean): PromiseLike<void>;

    /**
     * Pre-caches an entire directory of files recursively. Usually used for building custom compiler tooling.
     */
    compileAllSync(
        filePath: string, 
        shouldCompile: (path: string) => boolean): void;

    saveConfiguration(): PromiseLike<void>;

    saveConfigurationSync(): void;
}

export declare function enableLiveReload(options?: {
    strategy?: "react-hmr" | "naive";
}): void;

export declare function calculateDefaultCompileCacheDirectory(): string;

export declare function createCompilerHostFromBabelRc(file: string, rootCacheDir?: string): PromiseLike<CompilerHost>;

export declare function createCompilerHostFromBabelRcSync(file: string, rootCacheDir?: string): CompilerHost;

export declare function createCompilerHostFromConfigFile
(file: string, rootCacheDir?: string): PromiseLike<CompilerHost>;

export declare function createCompilerHostFromConfigFileSync
(file: string, rootCacheDir?: string): CompilerHost;

export declare function createCompilerHostFromProjectRoot
(rootDir: string, rootCacheDir?: string): PromiseLike<CompilerHost>;

export declare function createCompilerHostFromProjectRootSync
(rootDir: string, rootCacheDir?: string): CompilerHost;

export declare function createCompilers(): CompilersByMimeType;

// documentation unclear at this time...
export declare function forAllFilesSync(rootDirectory: string, func: any, ... args: any[]): void;

export declare function getDefaultConfiguration(): object;

export declare function init(appRoot: string, mainModule: string, productionMode?: boolean): void;

export declare function initializeGlobalHooks(compilerHost: CompilerHost): void;

export declare function initializeProtocolHook(compilerHost: CompilerHost): void;

export declare function registerRequireExtension(compilerHost: CompilerHost): void;

export interface CompilerBase {

}

export interface CompilersByMimeType {
    [mimeType: string]: CompilerBase;
}

export declare class FileChangedCache {
    
    static loadFromData(
        data: Object, 
        appRoot: string, 
        failOnCacheMiss: boolean): FileChangedCache;

    static loadFromFile(
        file: string, 
        appRoot: string, 
        failOnCacheMiss: boolean): FileChangedCache;
        
    constructor(appRoot: string, failOnCacheMiss?: boolean);
}
