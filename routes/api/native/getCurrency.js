const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.get_currency = (chain, name) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(chain, 'getcurrency', [name])
      .then((currency) => {
        resolve({ ...currency, parent_name: chain })
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_currency', (req, res, next) => {
    const { chainTicker, name } = req.body

    api.native.get_currency(chainTicker, name)
    .then((currency) => {
      const retObj = {
        msg: 'success',
        result: currency,
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