const {
  etherKeys,
  seedToPriv,
} = require('agama-wallet-lib/src/keys');

module.exports = (api) => {  
  api.eth._keys = (seed) => {
    seed = seedToPriv(seed, 'eth');
    return etherKeys(seed, true);
  };

  return api;
};