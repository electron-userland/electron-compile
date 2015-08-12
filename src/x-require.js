import _ from 'lodash';
import url from 'url';

export default (() => {
  if (process.type !== 'renderer' || !window || !window.document) return null;
  
  let proto = _.extend(Object.create(HTMLElement.prototype), {
    attributeChangedCallback: function(attrName, oldVal, newVal) {
      if (attrName !== 'href') return;
      let filePath = newVal;
      
      if (newVal.match(/^file:/i)) {
        let theUrl = url.parse(newVal);
        filePath = decodeURIComponent(theUrl.pathname);
        if (process.platform === 'win32') {
          filePath = filePath.slice(1);
        }
      }
      
      // Disallow require from reaching outside the application bundle
      if (filePath.toLowerCase().indexOf(process.resourcesPath.toLowerCase()) < 0) {
        throw new Error(`Cannot require ${filePath} outside of app bundle`);
      }
      
      // NB: We don't do any path canonicalization here because we rely on
      // InlineHtmlCompiler to have already converted any relative paths that
      // were used with x-require into absolute paths.
      require(filePath);
    }
  });

  return document.registerElement('x-require', proto);
}());
