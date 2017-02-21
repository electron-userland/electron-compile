import mimeTypes from '@paulcbetts/mime-types';

let HMR = false;

const d = require('debug')('electron-compile:require-hook');
let electron = null;

if (process.type === 'renderer') {
  window.__hot = [];
  electron = require('electron');
  HMR = electron.remote.getGlobal('__electron_compile_hmr_enabled__');

  if (HMR) {
    electron.ipcRenderer.on('__electron-compile__HMR', () => {
      d("Got HMR signal!");

      // Reset the module cache
      let cache = require('module')._cache;
      let toEject = Object.keys(cache).filter(x => x && !x.match(/[\\\/](node_modules|.*\.asar)[\\\/]/i));
      toEject.forEach(x => {
        d(`Removing node module entry for ${x}`);
        delete cache[x];
      });

      window.__hot.forEach(fn => fn());
    });
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
  if (HMR) {
    try {
      require('module').prototype.hot = {
        accept: (cb) => window.__hot.push(cb)
      };

      require.main.require('react-hot-loader/patch');
    } catch (e) {
      console.error(`Couldn't require react-hot-loader/patch, you need to add react-hot-loader@3 as a dependency! ${e.message}`);
    }
  }

  Object.keys(compilerHost.compilersByMimeType).forEach((mimeType) => {
    let ext = mimeTypes.extension(mimeType);

    require.extensions[`.${ext}`] = (module, filename) => {
      let {code} = compilerHost.compileSync(filename);

      if (code === null) {
        console.error(`null code returned for "${filename}".  Please raise an issue on 'electron-compile' with the contents of this file.`);
      }

      module._compile(code, filename);
    };
  });
}
