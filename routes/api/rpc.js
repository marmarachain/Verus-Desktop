const fs = require('fs-extra');
const os = require('os');
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
const request = require('request');

const RPC_CONF_UPDATE_TIMEOUT = 300000

module.exports = (api) => {
  api.getConf = (chain) => {  
    // any coind
    if (chain) {
      let _confLocation = api.confFileIndex[chain]
      api.log(`Checking conf location: ${api.confFileIndex[chain]}`, 'native.confd');

      if (fs.existsSync(_confLocation)) {
        const _rpcConf = fs.readFileSync(_confLocation, 'utf8');
        let _port = api.assetChainPorts[chain];

        // any coind
        if (api.nativeCoindList[chain.toLowerCase()]) {
          _port = api.nativeCoindList[chain.toLowerCase()].port;
        }

        if (_rpcConf.length) {
          let _match;
          let parsedRpcConfig = {
            user: '',
            pass: '',
            port: _port,
            pendingUpdate: false,
            updateTimeoutId: null
          };

          if (_match = _rpcConf.match(/rpcuser=\s*(.*)/)) {
            parsedRpcConfig.user = _match[1];
          }

          if ((_match = _rpcConf.match(/rpcpass=\s*(.*)/)) ||
              (_match = _rpcConf.match(/rpcpassword=\s*(.*)/))) {
            parsedRpcConfig.pass = _match[1];
          }

          if (api.nativeCoindList[chain.toLowerCase()]) {
            api.rpcConf[chain] = parsedRpcConfig;
          } else {
            api.rpcConf[chain === 'komodod' ? 'KMD' : chain] = parsedRpcConfig;
          }
        } else {
          api.log(`${_confLocation} is empty`, 'native.confd');
        }
      } else {
        api.log(`${_confLocation} doesnt exist`, 'native.confd');
      }
    }
  }

  api.sendToCli = (payload) => {
    return new Promise((resolve, reject) => {
      if (!payload) {  
        resolve(JSON.stringify({
          result: "error",
          code: -1,
          message: 'No payload provided to send to cli'
        }))
      } else {
        const _chain = payload.chain;
        let _cmd = payload.cmd;
  
        if (!api.rpcConf[_chain]) {
          api.getConf(_chain);
        } else if (!api.rpcConf[_chain].pendingUpdate) {
          api.log(`setting ${_chain} rpc config to update in ${RPC_CONF_UPDATE_TIMEOUT/1000} seconds`, 'native.confd');
          api.rpcConf[_chain].pendingUpdate = true
  
          const confUpdateId = setTimeout(() => api.getConf(_chain), RPC_CONF_UPDATE_TIMEOUT)
  
          api.rpcConf[_chain].updateTimeoutId = confUpdateId
        }
  
        let _body = {
          agent: "bitcoinrpc",
          method: _cmd
        };
  
        if (payload.params) {
          _body = {
            agent: "bitcoinrpc",
            method: _cmd,
            params: payload.params === " " ? [""] : payload.params
          };
        }
  
        if (payload.chain) {
          if (!api.rpcConf[payload.chain]) {  
            resolve(JSON.stringify({
              code: 404,
              message: `${payload.chain} hasn't been activated yet, and its rpc config isnt loaded.`
            }))
          } else {
            const options = {
              url: `http://localhost:${api.rpcConf[payload.chain].port}`,
              method: "POST",
              auth: {
                user: api.rpcConf[payload.chain].user,
                pass: api.rpcConf[payload.chain].pass
              },
              body: JSON.stringify(_body)
            };
  
            // send back body on both success and error
            // this bit replicates iguana core's behaviour
            request(options, (error, response, body) => {
              if (body) {
                resolve(body)
              } else {
                const retObj = {
                  result: "error",
                  error: {
                    code: 404,
                    message: api.coinsInitializing.includes(payload.chain)
                      ? `Initializing ${payload.chain} daemon...`
                      : `No running ${payload.chain} daemon found.`
                  }
                };
  
                resolve(JSON.stringify(retObj))
              }
            });
          }
        }
      }
    })
  }

  return api;
};