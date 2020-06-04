const Promise = require('bluebird');
const request = require('request');
const nspvPorts = require('./nspvPorts');
const { toSats } = require('agama-wallet-lib/src/utils');

module.exports = (api) => {
  api.nspvRequest = (coin, method, params) => {
    return new Promise((resolve, reject) => {
      const options = {
        url: `http://localhost:${nspvPorts[coin.toUpperCase()]}/`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
        }),
      };

      api.log(JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      }), 'spv.nspv.req');

      request(options, (error, response, body) => {
        api.log(body, 'spv.nspv.req');
        // TODO: proper error handling in ecl calls
        try {
          if (JSON) resolve(JSON.parse(body));
          else resolve('error');
        } catch (e) {
          console.log(e);
          resolve('json parse error');
        }
      });
    });
  };

  api.stopNSPVDaemon = (coin) => {
    if (coin === 'all') {
      for (let key in api.electrum.coinData) {
        if (api.electrum.coinData[key].nspv &&
            api.nspvProcesses[key].pid) {
          api.log(`NSPV daemon ${key.toUpperCase()} PID ${api.nspvProcesses[key].pid} is stopped`, 'spv.nspv.coin');
          api.nspvProcesses[key].process.kill('SIGHUP');
          delete api.nspvProcesses[key];
        }
      }
    } else {
      if (api.electrum.coinData[coin].nspv &&
          api.nspvProcesses[coin].pid) {
        api.log(`NSPV daemon ${coin.toUpperCase()} PID ${api.nspvProcesses[coin].pid} is stopped`, 'spv.nspv.coin');
        api.nspvProcesses[coin].process.kill('SIGHUP');
        delete api.nspvProcesses[coin];
      }
    }
  };

  api.nspvWrapper = (network) => {
    return {
      connect: () => {
        console.log('nspv connect');
      },
      close: () => {
        console.log('nspv close');
      },
      blockchainAddressGetHistory: (__address) => {
        return new Promise((resolve, reject) => {
          let _nspvTxs = [];

          console.log('nspv wrapper', 'blockchainAddressGetHistory');
          api.nspvRequest(
            network.toLowerCase(),
            'listtransactions',
            [__address],
          )
          .then((nspvTxHistory) => {
            if (nspvTxHistory &&
                nspvTxHistory.result &&
                nspvTxHistory.result === 'success') {
              for (let i = 0; i < nspvTxHistory.txids.length; i++) {
                _nspvTxs.push({
                  tx_hash: nspvTxHistory.txids[i].txid,
                  height: nspvTxHistory.txids[i].height,
                  value: nspvTxHistory.txids[i].value,
                });
              }

              console.log(_nspvTxs)
              resolve(_nspvTxs);
            } else {
              resolve('unable to get transactions history');
            }
          });
        });
      },
      blockchainAddressGetBalance: (__address) => {
        return new Promise((resolve, reject) => {
          api.nspvRequest(
            network.toLowerCase(),
            'listunspent',
            [__address],
          )
          .then((nspvTxHistory) => {
            if (nspvTxHistory &&
                nspvTxHistory.result &&
                nspvTxHistory.result === 'success') {
              console.log(nspvTxHistory)
              resolve({
                confirmed: toSats(nspvTxHistory.balance),
                unconfirmed: 0,
              });
              console.log({
                confirmed: toSats(nspvTxHistory.balance),
                unconfirmed: 0,
              })
            } else {
              resolve('unable to get balance');
            }
          });
        });
      },
      blockchainAddressListunspent: (__address) => {
        return new Promise((resolve, reject) => {
          let nspvUtxos = [];
          
          api.nspvRequest(
            network.toLowerCase(),
            'listunspent',
            [__address],
          )
          .then((nspvListunspent) => {
            if (nspvListunspent &&
                nspvListunspent.result &&
                nspvListunspent.result === 'success') {
              for (let i = 0; i < nspvListunspent.utxos.length; i++) {
                nspvUtxos.push(network.toLowerCase() === 'kmd' ? {
                  tx_hash: nspvListunspent.utxos[i].txid,
                  height: nspvListunspent.utxos[i].height,
                  value: toSats(nspvListunspent.utxos[i].value),
                  rewards: toSats(nspvListunspent.utxos[i].rewards),
                  tx_pos: nspvListunspent.utxos[i].vout,
                } : {
                  tx_hash: nspvListunspent.utxos[i].txid,
                  height: nspvListunspent.utxos[i].height,
                  value: toSats(nspvListunspent.utxos[i].value),
                  tx_pos: nspvListunspent.utxos[i].vout,
                });
              }

              resolve(nspvUtxos);
            } else {
              resolve('unable to get utxos');
            }
          });
        });
      },
      blockchainTransactionGet: (__txid, returnValue) => {
        return new Promise((resolve, reject) => {
          api.nspvRequest(
            network.toLowerCase(),
            'gettransaction',
            [__txid],
          )
          .then((nspvGetTx) => {
            if (returnValue) {
              resolve(nspvGetTx);
            } else {
              if (nspvGetTx &&
                  nspvGetTx.hasOwnProperty('hex')) {
                resolve(nspvGetTx.hex);
              } else {
                api.log(`nspv unable to get raw input tx ${__txid}`, 'spv.cache');
                resolve('unable to get raw transaction');
              }
            }
          });
        });
      },
    };
  };

  return api;
};