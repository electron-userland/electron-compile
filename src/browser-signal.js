import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';

import 'rxjs/add/observable/throw';

const isElectron = 'type' in process;
const isBrowser = process.type === 'browser';

const ipc = !isElectron ? null :
  isBrowser ? require('electron').ipcMain : require('electron').ipcRenderer;

const channelList = {};

export function send(channel, ...args) {
  if (isElectron && !isBrowser) {
    ipc.send(channel, ...args);
    return;
  }

  if (!(channel in channelList)) return;

  let { subj } = channelList[channel];
  subj.next(args);
}

export function listen(channel) {
  if (isElectron && !isBrowser) return Observable.throw(new Error("Can only call listen from browser"));

  return Observable.create((s) => {
    if (!(channel in channelList)) {
      let subj = new Subject();
      let ipcListener = (e, ...args) => { subj.next(args); };

      channelList[channel] = { subj: new Subject(), refcount: 0 };
      if (isElectron && isBrowser) {
        ipc.on(channel, ipcListener);
        channelList[channel].listener = ipcListener;
      }
    }

    channelList[channel].refcount++;

    let disp = channelList[channel].subj.subscribe(s);
    disp.add(() => {
      channelList[channel].refcount--;
      if (channelList[channel].refcount > 0) return;

      if (channelList[channel].listener) {
        ipc.removeListener(channel, channelList[channel].listener);
      }

      delete channelList.channel;
    });

    return disp;
  });
}
