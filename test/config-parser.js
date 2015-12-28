import {createCompilers} from '../lib/config-parser'

describe('the configuration parser module', function() {
  describe('the createCompilers method', function() {
    it('should return compilers', function() {
      let result = createCompilers();
      expect(Object.keys(result).length > 0).to.be.ok;
    });

    it('should definitely have these compilers', function() {
      let result = createCompilers();

      expect(result['application/javascript']).to.be.ok;
      expect(result['text/less']).to.be.ok;
    });
  });
});
