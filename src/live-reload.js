import FileChangedCache from './file-change-cache';
import {watchPath} from './pathwatcher-rx';
import {Observable} from 'rxjs/Observable';

import './custom-operators';

import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/fromPromise';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/timeout';

let BrowserWindow;
if (process.type === 'browser') {
  BrowserWindow = require('electron').BrowserWindow;
}

function reloadAllWindows() {
  let ret = BrowserWindow.getAllWindows().map(wnd => {
    if (!wnd.isVisible()) return Promise.resolve(true);

    return new Promise((res) => {
      wnd.webContents.reloadIgnoringCache();
      wnd.once('ready-to-show', () => res(true));
    });
  });

  return Promise.all(ret);
}

function triggerHMRInRenderers() {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('__electron-compile__HMR');
  });

  return Promise.resolve(true);
}

function triggerAssetReloadInRenderers(filePath) {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('__electron-compile__stylesheet_reload', filePath);
  });

  return Promise.resolve(true);
}

const defaultOptions = {
  'strategy': {
    'text/html': 'naive',
    'text/tsx': 'react-hmr',
    'text/jsx': 'react-hmr',
    'application/javascript': 'react-hmr',
    'text/stylus': 'hot-stylesheets',
    'text/sass': 'hot-stylesheets',
    'text/scss': 'hot-stylesheets'
  }
}

function setupWatchHMR(filePath) {
  watchPath(filePath).subscribe(() => triggerHMRInRenderers())
}

function setWatchHotAssets(filePath) {
  watchPath(filePath).subscribe(() => triggerAssetReloadInRenderers(filePath))
}

function setupWatchNaive(filePath) {
  watchPath(filePath).subscribe(() => reloadAllWindows())
}

export function enableLiveReload(options=defaultOptions) {
  let { strategy } = options;

  if (process.type !== 'browser' || !global.globalCompilerHost) throw new Error("Call this from the browser process, right after initializing electron-compile");

  // Enable the methods described in the reload strategy
  for (let mime of Object.keys(strategy)) { 
    switch(strategy[mime]) {
    case 'react-hmr':
      global.__electron_compile_hmr_enabled__ = true;
      break;
    case 'hot-stylesheets':
      global.__electron_compile_stylesheet_reload_enabled__ = true;
      break;
    }
  }

  // Find all the files compiled by electron-compile and setup watchers
  let filesWeCareAbout = global.globalCompilerHost.listenToCompileEvents()
    .filter(x => !FileChangedCache.isInNodeModules(x.filePath))
    .subscribe(x => {
      switch(strategy[x.mimeType]) {
      case 'react-hmr':
        setupWatchHMR(x.filePath)
        break;
      case 'hot-stylesheets':
        setWatchHotAssets(x.filePath)
        break;
      case 'naive':
      default:
        setupWatchNaive(x.filePath)
      }
    });
}