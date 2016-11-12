import path from 'path';
import mimeTypes from '@paulcbetts/mime-types';

const MimeTypesToExtensions = {
  'application/javascript': ['js', 'es6'],
  'text/less': ['less'],
  'text/stylus': ['stylus'],
  'text/jsx': ['jsx'],
  'text/cjsx': ['cjsx'],
  'text/coffeescript': ['coffee', 'litcoffee'],
  'text/typescript': ['ts'],
  'text/tsx': ['tsx'],
  'text/cson': ['cson'],
  'text/html': ['html', 'htm'],
  'text/jade': ['jade'],
  'text/plain': ['txt'],
  'image/svg+xml': ['svg'],
};

const ExtensionsToMimeTypes = {};
for (const mimetype of Object.keys(MimeTypesToExtensions)) {
  for (const ext of MimeTypesToExtensions[mimetype]) {
    ExtensionsToMimeTypes[ext] = mimetype;
  }
}

class MimeTypes {
  lookup(filepath) {
    const ext = path.extname(filepath);
    return ExtensionsToMimeTypes[ext.slice(1)] || mimeTypes.lookup(filepath) || false;
  }

  extension(mimeType) {
    return this.extensions(mimeType)[0];
  }

  extensions(mimeType) {
    if (MimeTypesToExtensions[mimeType]) {
      return MimeTypesToExtensions[mimeType];
    }
    const official = mimeTypes.extension(mimeType);
    return official ? [official] : [];
  }

}
export default new MimeTypes();
