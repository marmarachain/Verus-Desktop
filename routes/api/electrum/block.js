const Promise = require('bluebird');

module.exports = (api) => {
  api.setGet('/electrum/getblockinfo', (req, res, next) => {
    api.electrumGetBlockInfo(req.query.height, req.query.network)
    .then((json) => {
      const retObj = {
        msg: 'success',
        result: json,
      };

      res.send(JSON.stringify(retObj));
    });
  });

  api.electrumGetBlockInfo = (height, network) => {
    return new Promise((resolve, reject) => {
      async function _electrumGetBlockInfo() {
        if (api.electrum.coinData[network.toLowerCase()].nspv) {
          api.nspvRequest(
            network.toLowerCase(),
            'getinfo',
            [height]
          )
          .then((nspvGetinfo) => {
            api.log('nspv getblockinfo ==>', 'nspv.getblockinfo');
            api.log(nspvGetinfo.header, 'nspv.getblockinfo');

            if (nspvGetinfo &&
                nspvGetinfo.header) {
              resolve(nspvGetinfo.header);
            } else {
              resolve();
            }
          });
        } else {
          const ecl = await api.ecl(network);

          ecl.blockchainBlockGetHeader(height)
          .then((json) => {
            api.log('electrum getblockinfo ==>', 'spv.getblockinfo');
            api.log(json, 'spv.getblockinfo');

            resolve(json);
          });
        }
      }
      _electrumGetBlockInfo();
    });
  }

  api.setGet('/electrum/getcurrentblock', (req, res, next) => {
    api.electrumGetCurrentBlock(req.query.network)
    .then((json) => {
      const retObj = {
        msg: 'success',
        result: json,
      };

      res.send(JSON.stringify(retObj));
    });
  });

  api.electrumGetCurrentBlock = (network, returnNspvReq) => {
    return new Promise((resolve, reject) => {
      async function _electrumGetCurrentBlock() {
        if (api.electrum.coinData[network.toLowerCase()].nspv) {
          api.nspvRequest(
            network.toLowerCase(),
            'getinfo'
          )
          .then((nspvGetinfo) => {
            if (nspvGetinfo &&
                nspvGetinfo.height) {
              api.log('nspv currentblock ==>', 'nspv.currentblock');
              api.log(nspvGetinfo.height, 'nspv.currentblock');

              if (returnNspvReq) {
                resolve(nspvGetinfo);
              } else {
                resolve(nspvGetinfo.height);
              }
            } else {
              resolve();
            }
          });
        } else {
          const ecl = await api.ecl(network);

          ecl.blockchainHeadersSubscribe()
          .then((json) => {
            api.log('electrum currentblock (electrum >= v1.1) ==>', 'spv.currentblock');
            api.log(json, 'spv.currentblock');

            if (json &&
                json.hasOwnProperty('block_height')) {
              resolve(json.block_height);
            } else if (
              json &&
              json.hasOwnProperty('height')) {
              resolve(json.height);  
            } else {
              resolve(json);
            }
          });
        }
      };
      _electrumGetCurrentBlock();
    });
  }

  return api;
};