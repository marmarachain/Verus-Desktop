module.exports = (api) => {  
  api.electrum.get_addresses = (coin) => {
    const coinLc = coin.toLowerCase()
    let addresses = {
      public: [],
      private: []
    }

    return new Promise((resolve, reject) => {
      if (!api.electrumKeys[coinLc] || !api.electrumKeys[coinLc].pub) {
        throw new Error(`No address found for ${coin}`);
      }

      addresses.public.push({address: api.electrumKeys[coinLc].pub, tag: 'public'})

      Promise.all(addresses.public.map((addressObj) => {
        return api.electrum.get_balances(addressObj.address, coin)
      }))
      .then((addressBalances) => {
        addresses.public = addresses.public.map((addressObj, index) => {
          return {...addressObj, balances: {native: addressBalances[index].confirmed, reserve: {}}}
        })

        resolve(addresses)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/electrum/get_pubkey', (req, res, next) => {
    const coin = req.body.chainTicker;
    const coinLc = coin.toLowerCase()

    if (api.electrumKeys[coinLc] && api.electrumKeys[coinLc].pubHex) {
      res.send(JSON.stringify({
        msg: 'success',
        result: api.electrumKeys[coinLc].pubHex
      }));  
    } else {
      res.send(JSON.stringify({
        msg: 'error',
        result: `No pubkey found for electrum coin ${coin}`
      }));  
    }
  });

  api.setPost('/electrum/get_privkey', (req, res, next) => {
    const coin = req.body.chainTicker;
    const coinLc = coin.toLowerCase()

    if (api.electrumKeys[coinLc] && api.electrumKeys[coinLc].priv) {
      res.send(JSON.stringify({
        msg: 'success',
        result: api.electrumKeys[coinLc].priv
      }));  
    } else {
      res.send(JSON.stringify({
        msg: 'error',
        result: `No privkey found for electrum coin ${coin}`
      }));  
    }
  });

  api.setGet('/electrum/get_addresses', (req, res, next) => {
    const coin = req.query.chainTicker;

    if (!req.query.chainTicker) {
      res.send(JSON.stringify({msg: 'error', result: "No coin passed to electrum get_addresses"}));
    }
    
    api.electrum.get_addresses(coin)
    .then((addresses) => {
      const retObj = {
        msg: 'success',
        result: addresses,
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