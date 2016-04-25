import pify from 'pify';

// NB: We do this so that every module doesn't have to run pify
// on fs and zlib


/**
 * @private
 */ 
export const pfs = pify(require('fs'));

/**
 * @private
 */ 
export const pzlib = pify(require('zlib'));
