import mimeTypes from '@paulcbetts/mime-types';

const typesToRig = {
  'text/typescript': 'ts',
  'text/tsx': 'tsx',
  'text/jade': 'jade',
  'text/cson': 'cson',
  'text/stylus': 'styl',
  'text/sass': 'sass',
  'text/scss': 'scss',
  'text/vue': 'vue',
  'text/graphql': 'graphql',
  'text/ejs': 'ejs'
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
