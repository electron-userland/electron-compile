import mimeTypes from '@paulcbetts/mime-types';
import electron from 'electron';

const HMR = electron.remote && electron.remote.getGlobal('__electron_compile_hmr_enabled__');
const HMRSupported = ['text/jsx', 'application/javascript'];

if (process.type === 'renderer') {
  window.__hot = [];

  electron.ipcRenderer.on('__electron-compile__HMR', () => {
    // Reset the module cache
    require('module')._cache = {};
    window.__hot.forEach(fn => fn());
  });
}

/**
 * Initializes the node.js hook that allows us to intercept files loaded by
 * node.js and rewrite them. This method along with {@link initializeProtocolHook}
 * are the top-level methods that electron-compile actually uses to intercept
 * code that Electron loads.
 *
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */
export default function registerRequireExtension(compilerHost) {
  Object.keys(compilerHost.compilersByMimeType).forEach((mimeType) => {
    let ext = mimeTypes.extension(mimeType);
    const injectModuleHot = HMR && (HMRSupported.indexOf(mimeType) !== -1);

    require.extensions[`.${ext}`] = (module, filename) => {
      let {code} = compilerHost.compileSync(filename);
      if (injectModuleHot) {
        code = 'module.hot={accept:(cb)=>window.__hot.push(cb)};' + code;
      }
      if (code === null) {
        console.error(`null code returned for "${filename}".  Please raise an issue on 'electron-compile' with the contents of this file.`);
      }
      module._compile(code, filename);
    };
  });
}
