const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.get_zoperations = (coin) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'z_getoperationstatus', [])
      .then((zoperations) => {
        resolve(zoperations)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_zoperations', (req, res, next) => {
    const coin = req.body.chainTicker;

    api.native.get_zoperations(coin)
    .then((zoperations) => {
      const retObj = {
        msg: 'success',
        result: zoperations,
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