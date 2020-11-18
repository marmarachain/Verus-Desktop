const Promise = require('bluebird');

module.exports = (api) => {
  api.proxyActiveCoin = {};

  api.proxy = (network) => {
    if (network) {
      api.proxyActiveCoin = network;
    }

    return {
      connect: () => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      close: () => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainAddressGetBalance: (address) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainAddressListunspent: (address) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainAddressGetHistory: (address) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainEstimatefee: (blocks) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainBlockGetHeader: (height) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainHeadersSubscribe: () => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainTransactionGet: (txid) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainTransactionGetMerkle: (txid, height) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      serverVersion: () => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
      blockchainTransactionBroadcast: (rawtx) => {
        return new Promise((resolve, reject) => reject("Using electrum proxy servers is deprecated."));
      },
    };
  };

  return api;
}