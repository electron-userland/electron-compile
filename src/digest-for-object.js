import crypto from 'crypto';

function updateDigestForJsonValue(shasum, value) {
  // Implmentation is similar to that of pretty-printing a JSON object, except:
  // * Strings are not escaped.
  // * No effort is made to avoid trailing commas.
  // These shortcuts should not affect the correctness of this function.
  const type = typeof(value);

  if (type === 'string') {
    shasum.update('"', 'utf8');
    shasum.update(value, 'utf8');
    shasum.update('"', 'utf8');
    return;
  }

  if (type === 'boolean' || type === 'number') {
    shasum.update(value.toString(), 'utf8');
    return;
  }

  if (!value) {
    shasum.update('null', 'utf8');
    return;
  }

  if (Array.isArray(value)) {
    shasum.update('[', 'utf8');
    for (let i=0; i < value.length; i++) {
      updateDigestForJsonValue(shasum, value[i]);
      shasum.update(',', 'utf8');
    }
    shasum.update(']', 'utf8');
    return;
  }

  // value must be an object: be sure to sort the keys.
  let keys = Object.keys(value);
  keys.sort();

  shasum.update('{', 'utf8');

  for (let i=0; i < keys.length; i++) {
    updateDigestForJsonValue(shasum, keys[i]);
    shasum.update(': ', 'utf8');
    updateDigestForJsonValue(shasum, value[keys[i]]);
    shasum.update(',', 'utf8');
  }

  shasum.update('}', 'utf8');
}


/**
 * Creates a hash from a JS object
 * 
 * @private  
 */ 
export default function createDigestForObject(obj) {
  let sha1 = crypto.createHash('sha1');
  updateDigestForJsonValue(sha1, obj);
  
  return sha1.digest('hex');
}
