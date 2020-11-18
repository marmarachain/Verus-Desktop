const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.get_definedchains = (coin) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'getdefinedchains', [])
      .then((definedchains) => {
        resolve(definedchains)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_definedchains', (req, res, next) => {
    const coin = req.body.chainTicker;

    api.native.get_definedchains(coin)
    .then((definedchains) => {
      const retObj = {
        msg: 'success',
        result: definedchains,
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