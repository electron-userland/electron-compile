import _ from 'lodash';

const filenames = [
  'css/less',
  'js/babel',
  'js/coffeescript',
  'js/typescript',
  'inline-html'
];

export default _.map(filenames, (x) => require('./' + x));
