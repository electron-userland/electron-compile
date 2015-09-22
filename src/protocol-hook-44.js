import _ from 'lodash';
import url from 'url';
import fs from 'fs';
import btoa from 'btoa';
import mime from 'mime-types';
import pify from 'pify';

require('./regenerator');

const magicWords = "__magic__file__to__help__electron__compile.js";
const fsp = pify.all(require('fs'));

let protocol = null;

export function rigHtmlDocumentToInitializeElectronCompile(doc) {
  let lines = doc.split("\n");
  let replacement = `<head><script src="${magicWords}"></script>`;
  let replacedHead = false;

  for (let i=0; i < lines.length; i++) {
    if (!lines[i].match(/<head>/i)) continue;

    lines[i] = (lines[i]).replace(/<head>/i, replacement);
    replacedHead = true;
    break;
  }

  if (!replacedHead) {
    replacement = `<html$1><head><script src="${magicWords}"></script></head>`;
    for (let i=0; i < lines.length; i++) {
      if (!lines[i].match(/<html/i)) continue;

      lines[i] = (lines[i]).replace(/<html([^>]+)>/i, replacement);
      break;
    }
  }

  return lines.join("\n");
}

function requestFileJob(filePath, finish) {
  fs.readFile(filePath, (err, buf) => {
    if (err) { 
      if (err.errno === 34) {
        finish(-6); // net::ERR_FILE_NOT_FOUND
        return;
      } else {
        finish(-2); // net::FAILED
        return;
      }
    }
    
    finish({
      data: buf,
      mimeType: mime.lookup(filePath) || 'text/plain'
    });
  });
}

export function initializeProtocolHook(availableCompilers, initializeOpts) {
  protocol = protocol || require('protocol');

  // NB: If we were initialized with custom compilers, there is no way that we
  // can recreate that automatically.
  let disableAutoRendererSetup = initializeOpts.compilers && !initializeOpts.production;

  // NB: Electron 0.30.0 is somehow including the script tag over and over, we
  // need to bail if we've already set up.
  let encodedOpts = btoa(encodeURIComponent(JSON.stringify(initializeOpts)));
  let electronCompileSetupCode = initializeOpts.production ?
    `if (window.require && !window.__electron_compile_set_up) { window.__electron_compile_set_up = true; var opts = JSON.parse(decodeURIComponent(atob("${encodedOpts}"))); require('electron-compile').initForProduction(opts.cacheDir, opts.compilerInformation); }` :
    `if (window.require && !window.__electron_compile_set_up) { window.__electron_compile_set_up = true; var opts = JSON.parse(decodeURIComponent(atob("${encodedOpts}"))); require('electron-compile').initWithOptions(opts); }`;
    
  protocol.interceptBufferProtocol('file', async function(request, finish) {
    let uri = url.parse(request.url);

    if (request.url.indexOf(magicWords) > -1) {
      finish({
        mimeType: 'text/javascript',
        data: new Buffer(electronCompileSetupCode, 'utf8')
      });
      
      return;
    }

    // This is a protocol-relative URL that has gone pear-shaped in Electron,
    // let's rewrite it
    if (uri.host && uri.host.length > 1) {
      let newUri = request.url.replace(/^file:/, "https:");
      // TODO: Jump off this bridge later
      finish(-2);
    }

    let filePath = decodeURIComponent(uri.pathname);

    // NB: pathname has a leading '/' on Win32 for some reason
    if (process.platform === 'win32') {
      filePath = filePath.slice(1);
    }

    // NB: Special-case files coming from atom.asar or node_modules
    if (filePath.match(/[\/\\]atom.asar/) || filePath.match(/[\/\\]node_modules/)) {
      requestFileJob(filePath, finish);
      return;
    }

    let sourceCode = null;
    let compiler = null;

    try {
      compiler = _.find(availableCompilers, (x) => x.shouldCompileFile(filePath));

      if (!compiler) {
        requestFileJob(filePath, finish);
      }
    } catch (e) {
      console.log(`Failed to find compiler: ${e.message}\n${e.stack}`);
      finish(-2); // net::FAILED
      return;
    }

    try {
      sourceCode = sourceCode || await fsp.readFile(filePath, {encoding: 'utf8'});
    } catch (e) {
      // TODO: Actually come correct with these error codes
      if (e.errno === 34 /*ENOENT*/) {
        finish(-6); // net::ERR_FILE_NOT_FOUND
        return;
      }

      console.log(`Failed to read file: ${e.message}\n${e.stack}`);
      finish(-2); // net::FAILED
      return;
    }

    let realSourceCode = null;
    try {
      realSourceCode = compiler.loadFile(null, filePath, true, sourceCode);
    } catch (e) {
      finish({
        mimeType: compiler.getMimeType(),
        data: new Buffer(`Failed to compile ${filePath}: ${e.message}\n${e.stack}`)
      });
      
      return;
    }

    if (!disableAutoRendererSetup && filePath.match(/\.html?$/i)) {
      realSourceCode = rigHtmlDocumentToInitializeElectronCompile(realSourceCode, initializeOpts.cacheDir);
    }
    
    finish({
      data: new Buffer(realSourceCode),
      mimeType: compiler.getMimeType()
    });
  });
}
