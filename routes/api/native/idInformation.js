const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.get_identities = (coin, includeCanSpend = true, includeCanSign = false, includeWatchOnly = false) => {
    const promiseArr = [
      api.native.callDaemon(coin, 'listidentities', [includeCanSpend, includeCanSign, includeWatchOnly]),
      api.native.callDaemon(coin, "z_gettotalbalance", [])
    ]

    return new Promise((resolve, reject) => {      
      Promise.all(promiseArr)
      .then(async (resultArr) => {
        const identities = resultArr[0]
        const balances = resultArr[1]
        const totalBalance = Number(balances.total)

        if (!identities) {
          resolve([])
        } else {
          let formattedIds = identities.slice()
          let txcount = null
          let useCache = true

          try {
            const walletinfo = await api.native.callDaemon(coin, "getwalletinfo", [])
            txcount = walletinfo.txcount
          } catch (e) {
            useCache = false
            api.log('Not using address balance cache:', 'get_identities')
            api.log(e, 'get_identities')
          }
          
          for (let i = 0; i < formattedIds.length; i++) {
            try {
              const iAddr = identities[i].identity.identityaddress
              const zAddr = identities[i].identity.privateaddress
              let zBalance = null

              const iBalance = Number(
                await api.native.get_addr_balance(coin, iAddr, useCache, txcount, totalBalance)
              )
              
              if (zAddr != null) {
                try {
                  zBalance = Number(
                    await api.native.get_addr_balance(coin, zAddr, useCache, txcount, totalBalance)
                  );
                } catch (e) {
                  api.log(e, "get_identities");
                }
              }
              
              formattedIds[i].balances = {
                native: {
                  public: {
                    confirmed: iBalance,
                    unconfirmed: null,
                    immature: null
                  },
                  private: {
                    confirmed: zBalance
                  }
                },
                reserve: {}
              }

              formattedIds[i].addresses = {
                public: [{
                  address: iAddr,
                  balances: {
                    native: iBalance,
                    reserve: {}
                  },
                  tag: "identity"
                }],
                private: zAddr == null ? [] : [{
                  address: zAddr,
                  balances: {
                    native: zBalance,
                    reserve: {}
                  },
                  tag: "sapling"
                }]
              }
            } catch (e) {
              throw e;
            }
          }

          resolve(formattedIds)
        } 
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_identities', (req, res, next) => {    
    const { chainTicker, includeCanSpend, includeCanSign, includeWatchOnly } = req.body

    api.native.get_identities(chainTicker, includeCanSpend, includeCanSign, includeWatchOnly)
    .then((identities) => {
      const retObj = {
        msg: 'success',
        result: identities,
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

  api.native.get_identity = (coin, name) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'getidentity', [name])
      .then((identity) => {
        resolve(identity)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_identity', (req, res, next) => {
    const { chainTicker, name } = req.body

    api.native.get_identity(chainTicker, name)
    .then((identity) => {
      const retObj = {
        msg: 'success',
        result: identity,
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