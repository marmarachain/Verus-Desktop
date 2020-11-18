const Promise = require('bluebird');
const request = require('request');
const erc20ContractId = require('agama-wallet-lib/src/eth-erc20-contract-id');
const { ETHERSCAN_API_KEY } = require('../../../../keys/etherscan')

module.exports = (api) => {  
  api.eth.getContractABI = (address) => {
    const _url = [
      'module=contract',
      'action=getabi',
      `address=${address}`,
      `apikey=${ETHERSCAN_API_KEY}`,
    ];

    return new Promise((resolve, reject) => {
      const options = {
        url: 'https://api.etherscan.io/api?' + _url.join('&'),
        method: 'GET',
      };
      
      request(options, (error, response, body) => {
        if (response &&
            response.statusCode &&
            response.statusCode === 200) {
          try {
            const _json = JSON.parse(body);

            if (_json.message === 'OK' &&
                _json.result) {
              try {
                const _abi = JSON.parse(_json.result);
                resolve(_abi);
              } catch (e) {
                api.log('etherscan erc20 contact abi parse error', 'eth.erc20-abi');
                api.log(e, 'eth.erc20-abi');
                reject(e)
              }
            } else {
              api.log("Failed to get ABI for " + address, 'eth.erc20-abi');
              reject("Failed to get ABI for " + address)
            }
          } catch (e) {
            api.log('etherscan erc20 contact abi parse error', 'eth.erc20-abi');
            api.log(e, 'eth.erc20-abi');
            reject(e)
          }
        } else {
          api.log(`etherscan erc20 contact abi error: unable to request ${_url}`, 'eth.erc20-balance');
          reject("Failed to get ABI for " + address + ", network error.")
        }
      });
    });
  };

  api.eth.getTokenInfo = (symbol) => {
    const _url = `https://api.ethplorer.io/getTokenInfo/${erc20ContractId[symbol.toUpperCase()]}?apiKey=${ETHERSCAN_API_KEY}`;

    return new Promise((resolve, reject) => {
      if (!api.eth.tokenInfo[symbol.toUpperCase()]) {
        const options = {
          url: _url,
          method: 'GET',
        };

        request(options, (error, response, body) => {
          if (response &&
              response.statusCode &&
              response.statusCode === 200) {
            try {
              const _json = JSON.parse(body);

              if (_json &&
                  _json.address &&
                  _json.decimals) {
                api.eth.tokenInfo[symbol.toUpperCase()] = _json;
                resolve(_json);
              } else {
                resolve(false);
              }
            } catch (e) {
              api.log('ethplorer token info parse error', 'eth.erc20-tokeninfo');
              api.log(e, 'eth.erc20-tokeninfo');
            }
          } else {
            api.log(`ethplorer balance error: unable to request ${_url}`, 'eth.erc20-tokeninfo');
          }
        });
      } else {
        resolve(api.eth.tokenInfo[symbol.toUpperCase()]);
      }
    });
  };

  return api;
};