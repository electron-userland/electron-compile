import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import {pfs} from './promise';

export function forAllFiles(rootDirectory, func, ...args) {
  let rec = async (dir) => {
    let toAwait = _.map(await pfs.readdir(dir), async (name) => {
      let fullName = path.join(dir, name);
      let stats = await pfs.stat(fullName);

      if (stats.isDirectory()) {
        return rec(fullName);
      }

      if (stats.isFile()) {
        return func(fullName, ...args);
      }
    });

    await Promise.all(toAwait);
  };

  return rec(rootDirectory);
}

export function forAllFilesSync(rootDirectory, func, ...args) {
  let rec = (dir) => {
    _.each(fs.readdirSync(dir), (name) => {
      let fullName = path.join(dir, name);
      let stats = fs.statSync(fullName);
      
      if (stats.isDirectory()) {
        rec(fullName);
        return;
      }
      
      if (stats.isFile()) {
        func(fullName, ...args);
        return;
      }
    });
  };
  
  rec(rootDirectory);
}
