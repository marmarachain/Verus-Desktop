const Promise = require('bluebird');
const { standardizeInfo } = require('../utils/standardization/standardization')

module.exports = (api) => {    
  api.native.get_info = (coin) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'getinfo', [])
      .then((info) => {
        return standardizeInfo(info, coin, api)
      })
      .then(info => resolve(info))
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_info', (req, res, next) => {
    const coin = req.body.chainTicker;

    api.native.get_info(coin)
    .then((info) => {
      const retObj = {
        msg: 'success',
        result: info,
      };
  
      res.send(JSON.stringify(retObj));  
    })
    .catch(error => {
      const retObj = {
        msg: 'error',
        result: error.message,
      };
  
      res.send(JSON.stringify(retObj));  
    })
  });

  return api;
};