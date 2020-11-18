const { isKomodoCoin } = require('agama-wallet-lib/src/coin-helpers');
const _txDecoder = require('agama-wallet-lib/src/transaction-decoder');
const semverCmp = require('semver-compare');
const electrumMinVersionProtocolV1_4 = '1.9.0';

module.exports = (api) => {
  api.isKomodo = (network) => {
    const net = network.toLowerCase()
    return api.customKomodoNetworks[net] || isKomodoCoin(net)
  }

  api.isZcash = (network) => {
    if (api.isKomodo(network)) {
      network = 'kmd';
    }

    if (api.electrumJSNetworks[network.toLowerCase()] &&
        api.electrumJSNetworks[network.toLowerCase()].isZcash) {
      return true;
    }
  };

  api.isPos = (network) => {
    if (api.electrumJSNetworks[network.toLowerCase()] &&
        api.electrumJSNetworks[network.toLowerCase()].isPoS) {
      return true;
    }
  };

  api.electrumJSTxDecoder = (rawtx, networkName, network, insight) => {
    try { 
      return _txDecoder(rawtx, network);
    } catch (e) {};
  };

  api.getNetworkData = (network) => {
    if (api.electrumJSNetworks[network.toLowerCase()]) {
      return api.electrumJSNetworks[network.toLowerCase()];
    }
  
    let coin = api.validateChainTicker(network) || api.validateChainTicker(network.toUpperCase()) || api.validateChainTicker(network.toLowerCase());
    const coinUC = coin ? coin.toUpperCase() : null;

    if (!coin &&
        !coinUC) {
      coin = network.toUpperCase();
    }

    if (api.isKomodo(coin)) {
      return api.electrumJSNetworks.kmd;
    } else {
      return api.electrumJSNetworks[network];
    }
  }

  api.validateChainTicker = (coin) => {
    for (let key in api.electrumServers) {
      if (key.toLowerCase() === coin.toLowerCase()) {
        return key;
      }
    }

    throw new Error(`${coin} is not a valid network.`)
  }

  api.setGet('/electrum/servers', (req, res, next) => {
    if (req.query.abbr) { // (?) change
      let _electrumServers = {};

      for (let key in api.electrumServers) {
        _electrumServers[key] = api.electrumServers[key];
      }

      const retObj = {
        msg: 'success',
        result: {
          servers: _electrumServers,
        },
      };

      res.send(JSON.stringify(retObj));
    } else {
      const retObj = {
        msg: 'success',
        result: {
          servers: api.electrumServers,
        },
      };

      res.send(JSON.stringify(retObj));
    }
  });

  api.getServerVersion = (port, ip, proto) => {
    const ecl = new api.electrumJSCore(
      port,
      ip,
      proto,
      api.appConfig.general.electrum.socketTimeout
    );

    return new Promise((resolve, reject) => {
      if (api.electrumServersV1_4.hasOwnProperty(`${ip}:${port}:${proto}`)) {
        api.log(`getServerVersion cached ${`${ip}:${port}:${proto}`} isProtocolV1.4: ${api.electrumServersV1_4[`${ip}:${port}:${proto}`]}`, 'electrum.version.check');
        resolve(api.electrumServersV1_4[`${ip}:${port}:${proto}`]);
      } else {
        ecl.connect();
        ecl.serverVersion()
        .then((serverData) => {
          ecl.close();
          let serverVersion = 0;
          api.log('getServerVersion non-cached', 'electrum.version.check');

          if (serverData &&
              typeof serverData === 'string' &&
              serverData.indexOf('ElectrumX') > -1) {
            serverVersion = serverData.split('ElectrumX')[1].trim();
          } else if (
            serverData &&
            typeof serverData === 'object' &&
            serverData[0] &&
            serverData[0].indexOf('ElectrumX') > -1
          ) {
            serverVersion = serverData[0].split('ElectrumX')[1].trim();
          }
          
          if (serverVersion) {
            api.log(`${serverVersion} vs ${electrumMinVersionProtocolV1_4} ${(semverCmp(serverVersion, electrumMinVersionProtocolV1_4) >=0 ? '1.4' : '< 1.4')}`, 'electrum.version.check');
            
            if (semverCmp(serverVersion, electrumMinVersionProtocolV1_4) >= 0) {
              api.electrumServersV1_4[`${ip}:${port}:${proto}`] = true;
            } else {
              api.electrumServersV1_4[`${ip}:${port}:${proto}`] = false;
            }
          }

          api.log(`getServerVersion cached ${`${ip}:${port}:${proto}`} isProtocolV1.4: ${api.electrumServersV1_4[`${ip}:${port}:${proto}`]}`, 'electrum.version.check');
          resolve(api.electrumServersV1_4[`${ip}:${port}:${proto}`]);
        });
      }
    });
  };

  // remote api switch wrapper
  api.ecl = async function(network, customElectrum) {
    if (!network) {
      const IsElectrumProtocolV1_4 = await api.getServerVersion(
        customElectrum.port,
        customElectrum.ip,
        customElectrum.proto
      );
      let _ecl = new api.electrumJSCore(
        customElectrum.port,
        customElectrum.ip,
        customElectrum.proto,
        api.appConfig.general.electrum.socketTimeout
      );
      if (IsElectrumProtocolV1_4) _ecl.setProtocolVersion('1.4');
      return _ecl;
    } else {
      let _currentElectrumServer;
      network = network.toLowerCase();

      if (api.electrum.coinData[network]) {
        _currentElectrumServer = api.electrum.coinData[network];
      } else {
        const _server = api.electrumServers[network].serverList[0].split(':');
        _currentElectrumServer = {
          ip: _server[0],
          port: _server[1],
          proto: _server[2],
        };
      }

      if (api.electrumServers[network].proto === 'insight') {
        return api.insightJSCore(api.electrumServers[network]);
      } else {
        const ecl = await api.eclManager.getServer(network, customElectrum);
        return ecl;
      }
    }
  }

  return api;
};