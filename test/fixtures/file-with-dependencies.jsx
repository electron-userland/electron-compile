import fs from 'fs';
import * as asar from 'asar';
import './dependency_a';

// We're importing the asar module to see if we can resolve it's path 
// in node_modules

function blah() {
  console.log('blah')
}