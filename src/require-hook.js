import mimeTypes from '@paulcbetts/mime-types';
import electron from 'electron';

let HMR = false;
const HMRSupported = ['text/jsx', 'application/javascript'];

if (process.type === 'renderer') {
  window.__hot = [];
  HMR = electron.remote.getGlobal('__electron_compile_hmr_enabled__');

  electron.ipcRenderer.on('__electron-compile__HMR', () => {
    // Reset the module cache
    require('module')._cache = {};
    window.__hot.forEach(fn => fn());
  });

  try {
    require('react-hot-loader/patch');
  } catch (e) {
    console.error(`Couldn't require react-hot-loader/patch, you need to add react-hot-loader@3 as a dependency! ${e.message}`);
  }
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
