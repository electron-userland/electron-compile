import './support.js';

import path from 'path';
import fs from 'fs';

import {rigHtmlDocumentToInitializeElectronCompile} from '../src/protocol-hook';

describe('protocol hook library', function() {
  describe('The HTML include rigging', function() {
    it('should rig pages with HEAD tags', function() {
      let content = fs.readFileSync(path.join(__dirname, '..', 'test', 'fixtures', 'protourlrigging_1.html'), 'utf8');
      let result = rigHtmlDocumentToInitializeElectronCompile(content);
      
      let lines = result.split('\n');
      expect(lines.find((x) => x.match(/head.*__magic__file/i))).to.be.ok;
    });
    
    it('should rig pages without tags', function() {
      let content = fs.readFileSync(path.join(__dirname, '..', 'test', 'fixtures', 'protourlrigging_2.html'), 'utf8');
      let result = rigHtmlDocumentToInitializeElectronCompile(content);
      
      let lines = result.split('\n');
      expect(lines.find((x) => x.match(/head.*__magic__file/i))).to.be.ok;
    });
  });
});
