import mimeTypes from '@paulcbetts/mime-types';

let HMR = false;
let stylesheetReload = false;

const d = require('debug')('electron-compile:require-hook');
let electron = null;

if (process.type === 'renderer') {
  window.__hot = [];
  electron = require('electron');
  HMR = electron.remote.getGlobal('__electron_compile_hmr_enabled__');
  stylesheetReload = electron.remote.getGlobal('__electron_compile_stylesheet_reload_enabled__');

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

  if (stylesheetReload) {
    electron.ipcRenderer.on('__electron-compile__stylesheet_reload', (e, path) => {
      /*if (path.match(/.(jpg|jpeg|png|gif)$/i)) {
        let images = document.getElementsByTagName('img');

        for (let img of images) {
          let uri = img.src
          if (uri.includes(path)) {
            img.src = img.src; // trigger an update
          }
        }
      } else {*/
        let links = document.getElementsByTagName('link');

        for (let link of links) {
          let uri = link.href
          if (uri.includes(path)) {
            link.href = link.href; // trigger a reload for this stylesheet
          }
        }
      //}
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
