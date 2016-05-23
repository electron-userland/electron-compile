import _ from 'lodash';
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
  _.each(Object.keys(compilerHost.compilersByMimeType), (mimeType) => {
    let ext = mimeTypes.extension(mimeType);
    
    require.extensions[`.${ext}`] = (module, filename) => {
      let {code} = compilerHost.compileSync(filename);
      module._compile(code, filename);
    };
  });
}
