import fs from 'fs';
import path from 'path';
import {pfs} from './promise';


/**
 * Invokes a method on all files in a directory recursively.
 * 
 * @private
 */ 
export function forAllFiles(rootDirectory, func, ...args) {
  let rec = async (dir) => {
    let entries = await pfs.readdir(dir);
    
    for (let name of entries) {
      let fullName = path.join(dir, name);
      let stats = await pfs.stat(fullName);

      if (stats.isDirectory()) {
        await rec(fullName);
      }

      if (stats.isFile()) {
        await func(fullName, ...args);
      }
    }
  };

  return rec(rootDirectory);
}

export function forAllFilesSync(rootDirectory, func, ...args) {
  let rec = (dir) => {
    fs.readdirSync(dir).forEach((name) => {
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
