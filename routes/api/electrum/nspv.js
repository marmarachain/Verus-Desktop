const Promise = require('bluebird');
const request = require('request');
const { spawn } = require('child_process');
// TODO: read ports from coins file
const { toSats } = require('agama-wallet-lib/src/utils');
let isNSPVReady = {};
let nspvCheckReadyInterval = {};
let nspvCheckReadyIntervalIncrement = -1;
const NSPV_CHECK_READY_INTERVAL_TIMEOUT = 50;

module.exports = (api) => {
  api.nspvCheckReady = (coin) => {
    return new Promise((resolve, reject) => {
      if (!isNSPVReady[coin]) {
        if (!nspvCheckReadyInterval[coin]) nspvCheckReadyInterval[coin] = [];
        if (process.argv.indexOf('nspv-debug') > -1) api.log(`interval ${nspvCheckReadyIntervalIncrement} nspv daemon check set`, 'NSPV');
        nspvCheckReadyIntervalIncrement++;
        
        const interval = setInterval((nspvCheckReadyIntervalIncrement) => {
          
          if (isNSPVReady[coin]) {
            isNSPVReady[coin] = true;
            clearInterval(nspvCheckReadyInterval[coin][nspvCheckReadyIntervalIncrement]);
            if (process.argv.indexOf('nspv-debug') > -1) api.log(`interval ${nspvCheckReadyIntervalIncrement} nspv daemon check cleared`, 'NSPV');
          } else {
            if (process.argv.indexOf('nspv-debug') > -1) api.log(`awaiting ${coin} nspv daemon`, 'NSPV');
          }
        }, NSPV_CHECK_READY_INTERVAL_TIMEOUT, nspvCheckReadyIntervalIncrement);

        nspvCheckReadyInterval[coin].push(interval);
      }

      resolve(isNSPVReady[coin]);
    });
  };

  api.nspvRequest = async(coin, method, params) => {
    await api.nspvCheckReady(coin);

    if (api.electrum.coinData[coin] &&
        api.electrum.coinData[coin].nspv) {
      return new Promise((resolve, reject) => {
        const options = {
          url: `http://localhost:${api.nspvPorts[coin.toUpperCase()]}/`,
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
          if (body) {
            api.log(body, 'spv.nspv.req');
            // TODO: proper error handling in ecl calls
            try {
              if (JSON) resolve(JSON.parse(body));
              else resolve('error');
            } catch (e) {
              api.log('nspv json parse error', 'nspv');
              api.log(e);
              resolve('error');
            }
          } else {
            api.log('nspv empty response', 'nspv');
            resolve('error');
          }
        });
      });
    } else {
      resolve('error');
    }
  };

  api.startNSPVDaemon = (coin) => {
    isNSPVReady[coin] = false;

    const nspv = spawn(
      `${api.paths.assetsFolder}/nspv`,
      coin.toUpperCase() === 'KMD' ? [] : [coin.toUpperCase()],
      {
        cwd: api.paths.agamaDir,
      }, []
    );

    nspv.stdout.on('data', (data) => {
      if (process.argv.indexOf('nspv-debug') > -1) api.log(`stdout: ${data}`, 'NSPV');

      if (data.indexOf('NSPV_req "getnSPV" request sent to node') > -1 && !isNSPVReady[coin]) {
        api.log(`${coin} nspv is ready to serve requests`, 'NSPV');
        isNSPVReady[coin] = true;
      }
    });
    
    nspv.stderr.on('data', (data) => {
      if (process.argv.indexOf('nspv-debug') > -1) api.log(`stderr: ${data}`, 'NSPV');

      if (data.indexOf('NSPV_req "getnSPV" request sent to node') > -1 && !isNSPVReady[coin]) {
        api.log(`${coin} nspv is ready to serve requests`, 'NSPV');
        isNSPVReady[coin] = true;
      }
    });
    
    nspv.on('close', (code) => {
      api.log(`child process exited with code ${code}`, 'NSPV');
      isNSPVReady[coin] = false;
      
      if (api.nspvProcesses[coin]) {
        api.nspvProcesses[coin] = 'exited';
        
        setTimeout(() => {
            // attempt to revive supposedly dead daemon
          if (api.nspvProcesses[coin] &&
              api.nspvProcesses[coin] === 'exited') {
            const nspvProcess = api.startNSPVDaemon(coin);
            api.nspvProcesses[coin] = {
              process: nspvProcess,
              pid: nspvProcess.pid,
            };

            api.log(`${coin.toUpperCase()} NSPV daemon PID ${nspvProcess.pid} (restart)`, 'spv.coin');
          }
        }, 5000);
      }
    });

    return nspv;
  };

  api.stopNSPVDaemon = (coin) => {
    if (coin === 'all') {
      for (let key in api.electrum.coinData) {
        if (api.electrum.coinData[key] &&
            api.electrum.coinData[key].nspv &&
            api.nspvProcesses[key].pid) {
          api.log(`NSPV daemon ${key.toUpperCase()} PID ${api.nspvProcesses[key].pid} is stopped`, 'spv.nspv.coin');
          for (let i = 0; i < nspvCheckReadyInterval[key].length; i++) {
            clearInterval(nspvCheckReadyInterval[key][i]);
          }
          nspvCheckReadyInterval[coin] = [];
          isNSPVReady[key] = false;
          api.nspvProcesses[key].process.kill('SIGINT');
          delete api.nspvProcesses[key];
        }
      }
    } else {
      if (api.electrum.coinData[coin] &&
          api.electrum.coinData[coin].nspv &&
          api.nspvProcesses[coin].pid) {
        api.log(`NSPV daemon ${coin.toUpperCase()} PID ${api.nspvProcesses[coin].pid} is stopped`, 'spv.nspv.coin');

        for (let i = 0; i < nspvCheckReadyInterval[coin].length; i++) {
          clearInterval(nspvCheckReadyInterval[coin][i]);
        }
        nspvCheckReadyInterval[coin] = [];
        isNSPVReady[coin] = false;
        api.nspvProcesses[coin].process.kill('SIGINT');
        delete api.nspvProcesses[coin];
      }
    }
  };

  api.nspvWrapper = (network) => {
    return {
      connect: () => {
        api.log('nspv connect', 'nspv');
      },
      close: () => {
        api.log('nspv close', 'nspv');
      },
      blockchainAddressGetHistory: (__address) => {
        return new Promise((resolve, reject) => {
          let _nspvTxs = [];

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
              resolve({
                confirmed: toSats(nspvTxHistory.balance),
                unconfirmed: 0,
              });
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
      blockchainTransactionBroadcast: (__rawtx, returnValue) => {
        return new Promise((resolve, reject) => {
          api.nspvRequest(
            network.toLowerCase(),
            'broadcast',
            [__rawtx],
          )
          .then((nspvBroadcast) => {
            if (returnValue) {
              resolve(nspvBroadcast);
            } else {
              if (nspvBroadcast &&
                  nspvBroadcast.result &&
                  nspvBroadcast.result === 'success' &&
                  nspvBroadcast.expected === nspvBroadcast.broadcast) {
                resolve(nspvBroadcast.broadcast);
              } else {
                api.log(`nspv unable to push transaction ${__rawtx}`, 'spv.cache');
                resolve('unable to push raw transaction');
              }
            }
          });
        });
      },
    };
  };

  return api;
};