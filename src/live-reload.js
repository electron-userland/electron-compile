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

export function enableLiveReload(options={}) {
  let { strategy } = options;

  if (process.type !== 'browser' || !global.globalCompilerHost) throw new Error("Call this from the browser process, right after initializing electron-compile");

  switch(strategy) {
  case 'react-hmr':
    enableReactHMR();
    break;
  case 'naive':
  default:
    enableLiveReloadNaive();
  }
}

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

function enableLiveReloadNaive() {
  let filesWeCareAbout = global.globalCompilerHost.listenToCompileEvents()
    .filter(x => !FileChangedCache.isInNodeModules(x.filePath));

  let weShouldReload = filesWeCareAbout
    .mergeMap(x => watchPath(x.filePath).map(() => x))
    .guaranteedThrottle(1*1000);

  return weShouldReload
    .switchMap(() => Observable.defer(() => Observable.fromPromise(reloadAllWindows()).timeout(5*1000).catch(() => Observable.empty())))
    .subscribe(() => console.log("Reloaded all windows!"));
}

function triggerHMRInRenderers() {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('__electron-compile__HMR');
  });

  return Promise.resolve(true);
}

function enableReactHMR() {
  global.__electron_compile_hmr_enabled__ = true;

  let filesWeCareAbout = global.globalCompilerHost.listenToCompileEvents()
    .filter(x => !FileChangedCache.isInNodeModules(x.filePath));

  let weShouldReload = filesWeCareAbout
    .mergeMap(x => watchPath(x.filePath).map(() => x))
    .guaranteedThrottle(1*1000);

  return weShouldReload
    .switchMap(() => Observable.defer(() => Observable.fromPromise(triggerHMRInRenderers()).catch(() => Observable.empty())))
    .subscribe(() => console.log("HMR sent to all windows!"));
}
