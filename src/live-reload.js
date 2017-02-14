import {BrowserWindow} from 'electron';
import FileChangedCache from './file-change-cache';
import {watchFile} from './pathwatcher-rx';

import './custom-operators';

export function enableLiveReload(options={}) {
  let { strategy } = options;

  if (process.type !== 'browser' || !global.globalCompilerHost) throw new Error("Call this from the browser process, right after initializing electron-compile");

  switch(strategy) {
  case 'naive':
  default:
    enableLiveReloadNaive();
  }
}

function reloadAllWindows() {
  let ret = BrowserWindow.getAllWindows().map(wnd => {
    return new Promise((res) => {
      wnd.webContents.reloadIgnoringCache();
      wnd.once('ready-to-show', () => res());
    });
  });

  return Promise.all(ret);
}

function enableLiveReloadNaive() {
  let filesWeCareAbout = global.globalCompilerHost.listenToCompileEvents()
    .filter(x => FileChangedCache.isInNodeModules(x.filePath));

  let weShouldReload = filesWeCareAbout
    .mergeMap(x => watchFile(x).map(() => x))
    .guaranteedThrottle(4*1000);

  return weShouldReload
    .switchMap(() => reloadAllWindows())
    .subscribe(() => console.log("Reloaded all windows!"));
}
