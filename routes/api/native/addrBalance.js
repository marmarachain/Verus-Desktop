const Promise = require('bluebird');
const getObjBytes = require('../utils/objectUtil/getBytes')
const {
  RPC_INVALID_ADDRESS_OR_KEY
} = require("../utils/rpc/rpcStatusCodes");
const RpcError = require("../utils/rpc/rpcError");
const { fromSats } = require("agama-wallet-lib/src/utils");

const BYTES_PER_MB = 1000000

module.exports = (api) => {      
  // Gets an address balance (z_getbalance), txCount and zTotalBalance are used 
  // to check if the cache needs to be cleared and re-built
  api.native.get_addr_balance = async (coin, address, useCache, txCount = -1, zTotalBalance = -1) => {
    const cacheAddrBalanceResult = (result) => {
      const cacheSize = getObjBytes(api.native.cache);

      if (
        !isNaN(api.appConfig.general.native.nativeCacheMbLimit) &&
        cacheSize <
          api.appConfig.general.native.nativeCacheMbLimit * BYTES_PER_MB
      ) {
        api.native.cache.addr_balance_cache[coin].data[address] = result;
      } 
    }

    if (useCache) {
      if (
        api.native.cache.addr_balance_cache[coin] != null
      ) {  
        if (txCount !== api.native.cache.addr_balance_cache[coin].tx_count) {
          api.native.cache.addr_balance_cache[coin].tx_count = txCount;
          delete api.native.cache.addr_balance_cache[coin].data;
        }

        if (zTotalBalance !== api.native.cache.addr_balance_cache[coin].total_balance) {
          api.native.cache.addr_balance_cache[coin].total_balance = zTotalBalance;
          if (api.native.cache.addr_balance_cache[coin].data != null) {
            delete api.native.cache.addr_balance_cache[coin].data;
          }
        }
      }
        
      if (api.native.cache.addr_balance_cache[coin] == null) {
        api.native.cache.addr_balance_cache[coin] = {
          tx_count: -1,
          total_balance: -1,
          data: {}
        };
      } else if (api.native.cache.addr_balance_cache[coin].data == null) {
        api.native.cache.addr_balance_cache[coin].data = {}
      }
  
      if (api.native.cache.addr_balance_cache[coin].data[address] != null) {  
        return new Promise((resolve, reject) => {
          if (api.native.cache.addr_balance_cache[coin].data[address] instanceof RpcError) {
            reject(api.native.cache.addr_balance_cache[coin].data[address])
          } else resolve(api.native.cache.addr_balance_cache[coin].data[address])
        })
      }
    }
    
    // Optimization, TODO: Apply to all verusd coins
    const useGetAddrBalance = (coin === 'VRSC' || coin === 'VRSCTEST') && address[0] !== 'z'

    return new Promise((resolve, reject) => {
      api.native
        .callDaemon(coin, useGetAddrBalance ? "getaddressbalance" : "z_getbalance", [address])
        .then(balance => {
          if (useGetAddrBalance) {
            balance = fromSats(balance.balance)
          }
          
          if (useCache) cacheAddrBalanceResult(balance)
          resolve(balance);
        })
        .catch(err => {
          if (err.code === RPC_INVALID_ADDRESS_OR_KEY) cacheAddrBalanceResult(err)
          
          reject(err);
        });
    });
  };

  return api;
};