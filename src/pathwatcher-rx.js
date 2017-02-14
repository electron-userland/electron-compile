import fs from 'fs';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';

export default function watchPath(directory) {
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
