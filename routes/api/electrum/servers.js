const fs = require('fs-extra');
const _fs = require('graceful-fs');
const fsnode = require('fs');
const Promise = require('bluebird');

// map coin names to tickers
const _ticker = {
  litecoin: 'ltc',
  bitcoin: 'btc',
  argentum: 'arg',
  komodo: 'kmd',
  monacoin: 'mona',
  crown: 'crw',
  faircoin: 'fair',
  namecoin: 'nmc',
  vertcoin: 'vtc',
  viacoin: 'via',
  dogecoin: 'doge',
  wc: 'xwc',
};

// TODO: add coins check, network, electrum params

module.exports = (api) => {
  api.mergeLocalKvElectrumServers = () => {
    if (api.appConfig.general.electrum &&
        api.appConfig.general.electrum.syncServerListFromKv) {
      try {
        let kvElectrumServersCache = fs.readFileSync(`${api.paths.agamaDir}/kvElectrumServersCache.json`, 'utf8');

        // temp edge cases until kv edit is implemented
        kvElectrumServersCache.replace('tpc', 'tcp');
        kvElectrumServersCache.replace('kraken.cryptap.us:50004:tcp', 'kraken.cryptap.us:50004:ssl');
        kvElectrumServersCache.replace('cetus.cryptap.us:50004:tcp', 'cetus.cryptap.us:50004:ssl');

        kvElectrumServersCache = JSON.parse(kvElectrumServersCache);

        if (Object.keys(kvElectrumServersCache).length) {
          for (let key in kvElectrumServersCache) {
            if (api.electrumServers[key]) {
              if (!api.electrumServers[key].serverList) {
                api.electrumServers[key].serverList = kvElectrumServersCache[key];
              } else {
                for (let i = 0; i < kvElectrumServersCache[key].length; i++) {
                  if (!api.electrumServers[key].serverList ||
                      !api.electrumServers[key].serverList.find((item) => { return item === kvElectrumServersCache[key][i]; })) {
                    api.electrumServers[key].serverList.push(kvElectrumServersCache[key][i]);
                  }
                }
              }

              // api.electrumServers[key].abbr = key.toUpperCase();
              /*if (key === 'btcp') {
                console.log(api.electrumServers[key]);
              }*/
            }
          }
        }
      } catch (e) {
        api.log(e, 'spv.serverList');
      }
    }
  };

  api.loadElectrumServersList = () => {
    if (fs.existsSync(`${api.paths.agamaDir}/electrumServers.json`)) {
      const localElectrumServersList = fs.readFileSync(`${api.paths.agamaDir}/electrumServers.json`, 'utf8');

      api.log('electrum servers list set from local file', 'spv.serverList');
      api.writeLog('electrum servers list set from local file');

      try {
        api.electrumServers = JSON.parse(localElectrumServersList);
        api.mergeLocalKvElectrumServers();
      } catch (e) {
        api.log(e, 'spv.serverList');
      }
    } else {
      api.log('local electrum servers list file is not found!', 'spv.serverList');
      api.writeLog('local lectrum servers list file is not found!');

      api.saveElectrumServersList();
    }
  };

  api.saveElectrumServersList = (list) => {
    const electrumServersListFileName = `${api.paths.agamaDir}/electrumServers.json`;

    if (!list) {
      list = api.electrumServers;
    }

    _fs.access(api.paths.agamaDir, fs.constants.R_OK, (err) => {
      if (!err) {
        const FixFilePermissions = () => {
          return new Promise((resolve, reject) => {
            const result = 'electrumServers.json file permissions updated to Read/Write';

            fsnode.chmodSync(electrumServersListFileName, '0666');

            setTimeout(() => {
              api.log(result, 'spv.serverList');
              api.writeLog(result);
              resolve(result);
            }, 1000);
          });
        }

        const FsWrite = () => {
          return new Promise((resolve, reject) => {
            const result = 'electrumServers.json write file is done';

            fs.writeFile(electrumServersListFileName, JSON.stringify(list), 'utf8', (err) => {
              if (err)
                return api.log(err, 'spv.serverList');
            });

            fsnode.chmodSync(electrumServersListFileName, '0666');
            setTimeout(() => {
              api.log(result, 'spv.serverList');
              api.log(`electrumServers.json file is created successfully at: ${api.paths.agamaDir}`, 'spv.serverList');
              api.writeLog(`electrumServers.json file is created successfully at: ${api.paths.agamaDir}`);
              resolve(result);
            }, 2000);
          });
        }

        FsWrite()
        .then(FixFilePermissions());
      }
    });
  };

  api.saveKvElectrumServersCache = (list) => {
    const kvElectrumServersListFileName = `${api.paths.agamaDir}/kvElectrumServersCache.json`;

    _fs.access(api.paths.agamaDir, fs.constants.R_OK, (err) => {
      if (!err) {
        const FixFilePermissions = () => {
          return new Promise((resolve, reject) => {
            const result = 'kvElectrumServersCache.json file permissions updated to Read/Write';

            fsnode.chmodSync(kvElectrumServersListFileName, '0666');

            setTimeout(() => {
              api.log(result, 'spv.serverList');
              api.writeLog(result);
              resolve(result);
            }, 1000);
          });
        }

        const FsWrite = () => {
          return new Promise((resolve, reject) => {
            const result = 'kvElectrumServersCache.json write file is done';

            fs.writeFile(kvElectrumServersListFileName, JSON.stringify(list), 'utf8', (err) => {
              if (err)
                return api.log(err, 'spv.serverList');
            });

            fsnode.chmodSync(kvElectrumServersListFileName, '0666');
            setTimeout(() => {
              api.log(result, 'spv.serverList');
              api.log(`kvElectrumServersCache.json file is created successfully at: ${api.paths.agamaDir}`, 'spv.serverList');
              api.writeLog(`kvElectrumServersCache.json file is created successfully at: ${api.paths.agamaDir}`);
              resolve(result);
            }, 2000);
          });
        }

        FsWrite()
        .then(FixFilePermissions());
      }
    });
  };

  return api;
};
