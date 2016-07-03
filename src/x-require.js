import url from 'url';

function requireModule(href) {
  let filePath = href;
  
  if (filePath.match(/^file:/i)) {
    let theUrl = url.parse(filePath);
    filePath = decodeURIComponent(theUrl.pathname);

    if (process.platform === 'win32') {
      filePath = filePath.slice(1);
    }
  }
  
  // NB: We don't do any path canonicalization here because we rely on
  // InlineHtmlCompiler to have already converted any relative paths that
  // were used with x-require into absolute paths.
  require(filePath);
}

/**
 * @private
 */ 
export default (() => {
  if (process.type !== 'renderer' || !window || !window.document) return null;
  
  let proto = Object.assign(Object.create(HTMLElement.prototype), {
    createdCallback: function() {
      let href = this.getAttribute('src');
      if (href && href.length > 0) {
        requireModule(href);
      }
    }, 
    attributeChangedCallback: function(attrName, oldVal, newVal) {
      if (attrName !== 'src') return;
      requireModule(newVal);
    }
  });

  return document.registerElement('x-require', { prototype: proto });
})();
