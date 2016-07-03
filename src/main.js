const filenames = [
  'css/less',
  'css/stylus',
  'js/babel',
  'js/coffeescript',
  'js/typescript',
  'json/cson',
  'html/inline-html',
  'html/jade',
  'passthrough'
];

module.exports = filenames.map((x) => require('./' + x).default);
