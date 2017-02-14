import {Observable} from 'rxjs/Observable';
import {async} from 'rxjs/scheduler/async';

import 'rxjs/add/observable/range';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/timer';

import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/switch';
import 'rxjs/add/operator/zip';

function retryWithDelayOrError(errors, maxRetries) {
  return Observable.range(1, maxRetries + 1)
    .zip(errors, (i, e) => {
      return { attempts: i, error: e };
    })
    .mergeMap(({attempts, error}) => {
      return attempts <= maxRetries ?
        Observable.timer(attempts * 1000) :
        Observable.throw(error);
    });
}

const newCoolOperators = {
  guaranteedThrottle: function(time, scheduler = async) {
    return this
      .map((x) => Observable.timer(time, scheduler).map(() => x))
      .switch();
  },

  retryAtIntervals: function(maxRetries = 3) {
    return this.retryWhen((errors) => retryWithDelayOrError(errors, maxRetries));
  },
};


for (const key of Object.keys(newCoolOperators)) {
  Observable.prototype[key] = newCoolOperators[key];
}
