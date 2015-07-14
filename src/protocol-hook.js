import _ from 'lodash';
import url from 'url';  
import fs from 'fs';

const magicWords = "__magic__file__to__help__electron__compile.js";

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

export default function initializeProtocolHook(availableCompilers, cacheDir) {
  protocol = protocol || require('protocol');
  
  protocol.registerProtocol('file', (request) => {
    let uri = url.parse(request.url);
    
    if (request.url.indexOf(magicWords) > -1) {
      return new protocol.RequestStringJob({
        mimeType: 'text/javascript',
        data: `if (window.require) { require('electron-compile').init("${cacheDir}") }`
      });
    }

    // This is a protocol-relative URL that has gone pear-shaped in Electron,
    // let's rewrite it
    if (uri.host && uri.host.length > 1) {
      if (!protocol.RequestHttpJob) {
        console.log("Tried to correct protocol-relative URL, but this requires Electron 0.28.2 or higher: " + request.url);
        return new protocol.RequestErrorJob(404);
      }

      return new protocol.RequestHttpJob({
        url: request.url.replace(/^file:/, "https:")
      });
    }

    let filePath = uri.pathname;

    // NB: pathname has a leading '/' on Win32 for some reason
    if (process.platform === 'win32') {
      filePath = filePath.slice(1);
    }
    
    // NB: Special-case files coming from atom.asar or node_modules
    if (filePath.match(/[\/\\]atom.asar/) || filePath.match(/[\/\\]node_modules/)) {
        return new protocol.RequestFileJob(filePath);
    }
  
    let compiler = null;
    try {
      compiler = _.find(availableCompilers, (x) => x.shouldCompileFile(filePath));
      
      if (filePath.match(/\.html?$/i)) {
        let contents = fs.readFileSync(filePath, 'utf8');

        return new protocol.RequestStringJob({
          mimeType: "text/html",
          data: rigHtmlDocumentToInitializeElectronCompile(contents, cacheDir)
        });
      }
      
      if (!compiler) {
        return new protocol.RequestFileJob(filePath);
      }
    } catch (e) {
      console.log(`Failed to find compiler: ${e.message}\n${e.stack}`);
      return new protocol.RequestErrorJob(-2); // net::FAILED
    }

    let sourceCode = null;
    try {
      sourceCode = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      // TODO: Actually come correct with these error codes
      if (e.errno === 34) {
        return new protocol.RequestErrorJob(6); // net::ERR_FILE_NOT_FOUND
      }

      console.log(`Failed to read file: ${e.message}\n${e.stack}`);
      return new protocol.RequestErrorJob(2); // net::FAILED
    }

    let realSourceCode = null;
    try {
      realSourceCode = compiler.loadFile(null, filePath, true, sourceCode);
    } catch (e) {
      return new protocol.RequestStringJob({
        mimeType: compiler.getMimeType(),
        data: `Failed to compile ${filePath}: ${e.message}\n${e.stack}`
      });
    }

    return new protocol.RequestStringJob({
      mimeType: compiler.getMimeType(),
      data: realSourceCode,
    });
  });
}
