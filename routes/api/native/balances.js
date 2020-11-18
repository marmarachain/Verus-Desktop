const Promise = require('bluebird');

const PRIVATE = 1
const PUBLIC = 0

module.exports = (api) => {    
  api.native.get_balances = (coin, includePrivate) => {
    const getBalanceSchema = () => {
      return {
        public: {
          confirmed: null,
          unconfirmed: null,
          immature: null,
          interest: null,
          staking: null,
        },
        private: {
          confirmed: null,
        },
      }
    }
    
    return new Promise((resolve, reject) => {
      let balancePromises = [api.native.callDaemon(coin, 'getwalletinfo', [])]
      if (includePrivate || coin === 'KMD') balancePromises.push(api.native.callDaemon(coin, 'z_gettotalbalance', []))
      //KMD Interest is only found in z_gettotalbalance

      Promise.all(balancePromises)
      .then((jsonResults) => {
        let balances = {
          native: getBalanceSchema(),
          reserve: {}
        }

        jsonResults.map((balanceObj, index) => {
          if (index === PUBLIC) {
            balances.native.public.confirmed = Number(balanceObj['balance'])
            balances.native.public.unconfirmed = Number(balanceObj['unconfirmed_balance'])
            balances.native.public.immature = Number(balanceObj['immature_balance'])
            balances.native.public.staking = Number(balanceObj['eligible_staking_balance'])

            const immature_reserve_balance = {
              key: "immature",
              balance: balanceObj["immature_reserve_balance"] || {},
            };
            const reserve_balance = {
              key: "confirmed",
              balance: balanceObj["reserve_balance"] || {},
            };
            const unconfirmed_reserve_balance = {
              key: "unconfirmed",
              balance: balanceObj["unconfirmed_reserve_balance"] || {},
            };

            const reserve_balances = {immature_reserve_balance, reserve_balance, unconfirmed_reserve_balance}

            Object.keys(reserve_balances).map(reserve_balance_key => {
              Object.keys(reserve_balances[reserve_balance_key].balance).map(currency => {
                if (balances.reserve[currency] == null) balances.reserve[currency] = getBalanceSchema()

                balances.reserve[currency].public[
                  reserve_balances[reserve_balance_key].key
                ] = reserve_balances[reserve_balance_key].balance[currency];
              })
            })

          } else if (index === PRIVATE) {
            balances.native.private.confirmed = Number(balanceObj['private'])
            balances.native.public.interest = Number(balanceObj['interest'])
          }
        })

        resolve(balances)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/get_balances', (req, res, next) => {
    const includePrivate = req.body.includePrivate;
    const coin = req.body.chainTicker;

    api.native.get_balances(coin, includePrivate)
    .then((balances) => {
      const retObj = {
        msg: 'success',
        result: balances,
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