const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.get_blocksubsidy = (coin, height) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'getblocksubsidy', height == null ? [] : [height])
      .then((blocksubsidy) => {
        resolve(blocksubsidy)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_blocksubsidy', (req, res, next) => {
    const { height } = req.body
    const coin = req.body.chainTicker;
    
    api.native.get_blocksubsidy(coin, height)
    .then((blocksubsidy) => {
      const retObj = {
        msg: 'success',
        result: blocksubsidy,
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