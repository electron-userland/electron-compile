import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';

import 'rxjs/add/observable/throw';

const isElectron = 'type' in process;
const isBrowser = process.type === 'browser';

const ipc = !isElectron ? null :
  // tslint:disable-next-line:no-var-requires
  isBrowser ? require('electron').ipcMain : require('electron').ipcRenderer;


interface ChannelListItem {
  listener: ((_e: any, ...args: any[]) => void) | null;
  refcount: number;
  subj: Subject<any[]>;
}

const channelList = new Map<string, ChannelListItem>();

export function send(channel: string, ...args: any[]) {
  if (isElectron && !isBrowser) {
    ipc.send(channel, ...args);
    return;
  }

  if (!channelList.has(channel)) return;

  let { subj } = channelList.get(channel)!;
  subj.next(args);
}

export function listen(channel: string) {
  if (isElectron && !isBrowser) return Observable.throw(new Error('Can only call listen from browser'));

  return Observable.create((s: Subject<any[]>) => {
    if (!(channelList.has(channel))) {
      let subj = new Subject<any[]>();
      let ipcListener = (_e: any, ...args: any[]) => { subj.next(args); };

      channelList.set(channel, { subj, refcount: 0, listener: null });
      if (isElectron && isBrowser) {
        ipc.on(channel, ipcListener);
        channelList.get(channel)!.listener = ipcListener;
      }
    }

    channelList.get(channel)!.refcount++;

    let disp = channelList.get(channel)!.subj.subscribe(s);
    disp.add(() => {
      channelList[channel].refcount--;
      if (channelList[channel].refcount > 0) return;

      if (channelList[channel].listener) {
        ipc.removeListener(channel, channelList[channel].listener);
      }

      channelList.delete(channel);
    });

    return disp;
  });
}
