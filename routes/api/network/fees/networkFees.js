const Promise = require('bluebird');

module.exports = (api) => {
  api.setGet('/get_networkfees', (req, res, next) => {
    if (!req.query.chainTicker) {
      res.send(JSON.stringify({msg: 'error', result: "No coin passed to get_networkfees"}));
    }
    
    api.electrum.get_networkfees(req.query.chainTicker)
    .then(feesObj => {
      const retObj = {
        msg: 'success',
        result: feesObj
      };

      res.send(JSON.stringify(retObj));
    })
    .catch(e => {
      const retObj = {
        msg: 'error',
        result: e.message
      };

      res.send(JSON.stringify(retObj));
    })
  });

  api.electrum.get_networkfees = (chainTicker) => {
    if (api.networkFees[chainTicker] != null) {
      return new Promise(async (resolve, reject) => {
        api.networkFees[chainTicker]()
        .then(fees => resolve(fees))
        .catch(e => reject(e))
      })
    } else {
      return new Promise((resolve, reject) => {reject(new Error(`Network fee function not found for ${chainTicker}`))})
    }
  }

  return api;
};