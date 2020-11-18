const Promise = require('bluebird');
const { standardizeMiningInfo } = require('../utils/standardization/standardization')

module.exports = (api) => {    
  api.native.get_mininginfo = (coin) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'getmininginfo', [])
      .then((mininginfo) => {
        resolve(standardizeMiningInfo(mininginfo))
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_mininginfo', (req, res, next) => {
    const coin = req.body.chainTicker;

    api.native.get_mininginfo(coin)
    .then((mininginfo) => {
      const retObj = {
        msg: 'success',
        result: mininginfo,
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