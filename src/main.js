import _ from 'lodash';

const filenames = [
  'css/less',
  'js/babel',
  'js/coffeescript',
  'js/typescript',
  'json/cson',
  'html/inline-html',
  'html/jade',
  'passthrough'
];

module.exports = _.map(filenames, (x) => require('./' + x).default);
