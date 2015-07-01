import _ from 'lodash';
import fs from 'fs';
import path from 'path';

export default function(rootDirectory, func, ...args) {
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
