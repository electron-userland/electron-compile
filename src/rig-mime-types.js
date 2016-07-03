import mimeTypes from '@paulcbetts/mime-types';

const typesToRig = {
  'text/typescript': 'ts',
  'text/jade': 'jade',
  'text/cson': 'cson',
  'text/stylus': 'styl'
};


/**
 * Adds MIME types for types not in the mime-types package
 *
 * @private
 */
export function init() {
  Object.keys(typesToRig).forEach((type) => {
    let ext = typesToRig[type];

    mimeTypes.types[ext] = type;
    mimeTypes.extensions[type] = [ext];
  });
}
