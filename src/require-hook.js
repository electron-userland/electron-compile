import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import mimeTypes from 'mime-types';

/**
 * Initializes the node.js hook that allows us to intercept files loaded by 
 * node.js and rewrite them. This method along with {@link initializeProtocolHook} 
 * are the top-level methods that electron-compile actually uses to intercept 
 * code that Electron loads.
 *  
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */ 
export default function registerRequireExtension(compilerHost) {
  let stubFile = path.join(compilerHost.rootCacheDir, '..', 'stub.asar');
  if (fs.existsSync(stubFile)) {
    process.env.NODE_PATH = stubFile;
  } else {
    process.env.NODE_PATH = '';
  }
  
  require('module').Module._initPaths();
  
  _.each(Object.keys(compilerHost.compilersByMimeType), (mimeType) => {
    let ext = mimeTypes.extension(mimeType);
    
    require.extensions[`.${ext}`] = (module, filename) => {
      let {code} = compilerHost.compileSync(filename);
      module._compile(code, filename);
    };
  });
}
