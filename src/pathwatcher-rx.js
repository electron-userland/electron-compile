import fs from 'fs';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import LRU from 'lru-cache';

import 'rxjs/add/operator/publish';

export function watchPathDirect(directory) {
  return Observable.create((subj) => {
    let dead = false;

    const watcher = fs.watch(directory, {}, (eventType, fileName) => {
      if (dead) return;
      subj.next({eventType, fileName});
    });

    watcher.on('error', (e) => {
      dead = true;
      subj.error(e);
    });

    return new Subscription(() => { if (!dead) { watcher.close(); } });
  });
}

const pathCache = new LRU({ length: 256 });
export function watchPath(directory) {
  let ret = pathCache.get(directory);
  if (ret) return ret;

  ret = watchPathDirect(directory).publish().refCount();
  pathCache.set(directory, ret);
  return ret;
}
