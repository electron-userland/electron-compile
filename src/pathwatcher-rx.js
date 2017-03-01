import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';
import {Gaze} from 'gaze';
import LRU from 'lru-cache';

import 'rxjs/add/operator/publish';

export function watchPathDirect(directory) {
  return Observable.create((subj) => {
    let dead = false;

    const watcher = new Gaze();
    watcher.on('error', (err) => {
      dead = true;
      subj.error(err);
    });
    watcher.add(directory);
    watcher.on('changed', (fileName) => {
      if (dead) return;
      subj.next({fileName, eventType: 'changed'});
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
