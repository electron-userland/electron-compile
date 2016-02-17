import './babel-maybefill';
import url from 'url';
import fs from 'fs';
import mime from 'mime-types';

import CompilerHost from './compiler-host';

const magicWords = "__magic__file__to__help__electron__compile.js";
const magicGlobalForRootCacheDir = '__electron_compile_root_cache_dir';
const magicGlobalForAppRootDir = '__electron_compile_app_root_dir';

const d = require('debug')('electron-compile:protocol-hook');

let protocol = null;

/**
 * Adds our script header to the top of all HTML files
 *  
 * @private
 */ 
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

let rendererInitialized = false;

/**
 * Called by our rigged script file at the top of every HTML file to set up
 * the same compilers as the browser process that created us
 *  
 * @private
 */ 
export function initializeRendererProcess(readOnlyMode) {
  if (rendererInitialized) return;
  
  // NB: If we don't do this, we'll get a renderer crash if you enable debug
  require('debug/browser');
  
  let rootCacheDir = require('remote').getGlobal(magicGlobalForRootCacheDir);
  let appRoot = require('remote').getGlobal(magicGlobalForAppRootDir);
  let compilerHost = null;
  
  // NB: This has to be synchronous because we need to block HTML parsing
  // until we're set up
  if (readOnlyMode) {
    d(`Setting up electron-compile in precompiled mode with cache dir: ${rootCacheDir}`);
    compilerHost = CompilerHost.createReadonlyFromConfigurationSync(rootCacheDir, appRoot);
  } else {
    d(`Setting up electron-compile in development mode with cache dir: ${rootCacheDir}`);
    const { createCompilers } = require('./config-parser');
    const compilersByMimeType = createCompilers();
    
    compilerHost = CompilerHost.createFromConfigurationSync(rootCacheDir, appRoot, compilersByMimeType);
  }
  
  require('./x-require');
  require('./require-hook').default(compilerHost);
  rendererInitialized = true;
}


/**
 * Initializes the protocol hook on file: that allows us to intercept files 
 * loaded by Chromium and rewrite them. This method along with 
 * {@link registerRequireExtension} are the top-level methods that electron-compile
 * actually uses to intercept code that Electron loads.
 *  
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */ 
export function initializeProtocolHook(compilerHost) {
  protocol = protocol || require('protocol');
  
  global[magicGlobalForRootCacheDir] = compilerHost.rootCacheDir;
  global[magicGlobalForAppRootDir] = compilerHost.appRoot;
  
  const electronCompileSetupCode = `if (window.require) require('electron-compile/lib/protocol-hook').initializeRendererProcess(${compilerHost.readOnlyMode});`;

  protocol.interceptBufferProtocol('file', async function(request, finish) {
    let uri = url.parse(request.url);

    d(`Intercepting url ${request.url}`);
    if (request.url.indexOf(magicWords) > -1) {
      finish({
        mimeType: 'application/javascript',
        data: new Buffer(electronCompileSetupCode, 'utf8')
      });
      
      return;
    }

    // This is a protocol-relative URL that has gone pear-shaped in Electron,
    // let's rewrite it
    if (uri.host && uri.host.length > 1) {
      //let newUri = request.url.replace(/^file:/, "https:");
      // TODO: Jump off this bridge later
      d(`TODO: Found bogus protocol-relative URL, can't fix it up!!`);
      finish(-2);
    }

    let filePath = decodeURIComponent(uri.pathname);

    // NB: pathname has a leading '/' on Win32 for some reason
    if (process.platform === 'win32') {
      filePath = filePath.slice(1);
    }

    // NB: Special-case files coming from atom.asar or node_modules
    if (filePath.match(/[\/\\]atom.asar/) || filePath.match(/[\/\\]node_modules/)) {
      // NBs on NBs: If we're loading an HTML file from node_modules, we still have
      // to do the HTML document rigging
      if (filePath.match(/\.html?$/i)) {
        let riggedContents = null;
        fs.readFile(filePath, 'utf8', (err, contents) => {
          if (err) {
            if (err.errno === 34) {
              finish(-6); // net::ERR_FILE_NOT_FOUND
              return;
            } else {
              finish(-2); // net::FAILED
              return;
            }
          }

          riggedContents = rigHtmlDocumentToInitializeElectronCompile(contents);
          finish({ data: new Buffer(riggedContents), mimeType: 'text/html' });
          return;
        });

        return;
      }

      requestFileJob(filePath, finish);
      return;
    }
    
    try {
      let result = await compilerHost.compile(filePath);

      if (result.mimeType === 'text/html') {
        result.code = rigHtmlDocumentToInitializeElectronCompile(result.code);
      }
      
      if (result.binaryData || result.code instanceof Buffer) {
        finish({ data: result.binaryData || result.code, mimeType: result.mimeType });
        return;
      } else {
        finish({ data: new Buffer(result.code), mimeType: result.mimeType });
        return;
      }
    } catch (e) {
      let err = `Failed to compile ${filePath}: ${e.message}\n${e.stack}`;
      d(err);
      
      if (e.errno === 34 /*ENOENT*/) {
        finish(-6); // net::ERR_FILE_NOT_FOUND
        return;
      }

      finish({ mimeType: 'text/plain', data: new Buffer(err) });
      return;
    }
  });
}
