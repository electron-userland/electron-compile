import _ from 'lodash';
import mkdirp from 'mkdirp';
import path from 'path';
import fs from 'fs';
import url from 'url';

const availableCompilers = _.map([
  './js/babel',
  './js/coffeescript',
  './js/typescript',
  './css/less',
  './css/scss'
], (x) => {
  const Klass = require(x);
  return new Klass();
});

export function init(cacheDir=null) {
  if (process.type && process.type !== 'browser') {
    throw new Error("Only call this method in the browser process, in app.ready");
  }
  
  if (!cacheDir) {
    let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
    let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');
    
    cacheDir = path.join(tmpDir, `compileCache_${hash}`);
    mkdirp.sync(cacheDir);
  }
  
  _.each(availableCompilers, (compiler) => {
    compiler.register();
    compiler.setCacheDirectory(cacheDir);
  });
  
  // If we're node.js / io.js, just bail
  if (!process.type) return;
  
  const protocol = require('protocol');
  protocol.registerProtocol('file', (request) => {
    let filePath = url.parse(request.url).pathname;
  
    let sourceCode = null;
    try {
      console.log(`Attempting to read: ${filePath}`);
      sourceCode = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      // TODO: Actually come correct with these error codes
      if (e.errno === 34) {
        console.log(`File not found!`);
        return new protocol.RequestErrorJob(6); // net::ERR_FILE_NOT_FOUND
      }
      
      console.log(`Something weird! ${e.message}\n${e.stack}`);
      return new protocol.RequestErrorJob(2); // net::FAILED
    }
    
    let compiler = null;
    try {
      console.log("Looking for a compiler!");
      compiler = _.find(availableCompilers, (x) => x.shouldCompileFile(sourceCode, filePath));
      
      if (!compiler) {
        console.log("Didn't find one!");
        return new protocol.RequestFileJob(filePath);
      }
    } catch (e) {
      console.log(`Something weird! ${e.message}\n${e.stack}`);
      return new protocol.RequestErrorJob(-2); // net::FAILED
    }
        
    let realSourceCode = null;
    try {
      console.log("Executing compiler!");
      console.log(Object.keys(compiler));
      realSourceCode = compiler.loadFile(null, filePath, true, sourceCode);
    } catch (e) {
      return new protocol.RequestStringJob({
        mimeType: 'text/plain',
        data: `Failed to compile ${filePath}: ${e.message}\n${e.stack}`
      });
    }
    
    console.log("We did it!");
    return new protocol.RequestStringJob({
      mimeType: compiler.getMimeType(),
      data: realSourceCode,
    });
  });
}
