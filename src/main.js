import _ from 'lodash';

const filenames = [
  'css/less',
  'js/babel',
  'js/coffeescript',
  'js/coffeescript-ng',
  'js/typescript',
  'inline-html'
];

export default _.map(filenames, (x) => require('./' + x));
