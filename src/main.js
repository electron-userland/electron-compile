import _ from 'lodash';

const filenames = [
  'css/less',
  'js/babel-ng',
  'js/coffeescript-ng',
  'js/typescript-ng',
  'inline-html'
];

export default _.map(filenames, (x) => require('./' + x));
