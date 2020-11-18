const Promise = require('bluebird');

module.exports = (api) => {  
  api.native.getAddressType = (address) => {
    if (address[0] === 'z') {
      if (address[1] === 'c') return 'sprout'
      if (address[1] === 's') return 'sapling'
    } else if (address[0] === 'i') {
      return 'identity'
    } else if (address[0] === 'b') {
      return 'P2SH'
    } else {
      return 'public'
    }
  }
  
  api.native.get_addresses = (coin, includePrivate) => {
    return new Promise((resolve, reject) => {
      let addressPromises = [
        api.native.callDaemon(coin, "listaddressgroupings", []),
        api.native.callDaemon(coin, "getaddressesbyaccount", [""]),
        api.native.callDaemon(coin, "z_gettotalbalance", []),
        api.native.callDaemon(coin, "getwalletinfo", [])
      ];

      if (includePrivate) {
        addressPromises.push(
          api.native.callDaemon(coin, "z_listaddresses", [])
        );
      }

      Promise.all(addressPromises)
        .then(async jsonResults => {
          let resObj = {
            public: [],
            private: []
          };
          let pubAddrsSeen = [];
          let addressGroupingsParsed = {}
          let zBalanceSeen = (tBalanceSeen = 0);

          const addressGroupings = jsonResults[0];
          const addressesByAccount = jsonResults[1];
          const totalBalance = jsonResults[2];
          const walletInfo = jsonResults[3];
          const { txcount } = walletInfo
          const privateAddrListResult =
            jsonResults.length > 4 ? jsonResults[4] : [];

          // Compile public addresses from listaddressgroupings
          addressGroupings.forEach(addressGrouping => {
            addressGrouping.forEach(addressArr => {
              const address = addressArr[0]

              if (!pubAddrsSeen.includes(address)) {
                //let balanceObj = ;
                let balance = addressArr[1]
                tBalanceSeen += balance

                // Addresses that start with an 'R' and dont include an account field are labeled
                // as change
                let tag =
                  address[0] === "R" && addressArr.length < 3
                    ? "change"
                    : api.native.getAddressType(address);

                addressGroupingsParsed[address] = {
                  address,
                  tag,
                  balances: { native: balance, reserve: {} }
                }

                pubAddrsSeen.push(address);
              } else {
                // If duplicate, add to balance and double check if it is really 
                // a change address
                const { tag, balances } = addressGroupingsParsed[address]
                
                const newTag =
                  tag === "change" && addressArr.length > 2
                    ? api.native.getAddressType(address)
                    : tag;

                const newBalance = balances.native + addressArr[1]

                addressGroupingsParsed[address] = {
                  balances: { native: newBalance, reserve: {} },
                  tag: newTag,
                  address
                }
              }
            });
          });

          // Filter out addresses according to settings
          resObj.public = resObj.public.concat(Object.values(addressGroupingsParsed).filter(addressObj => {
            const { tag, balances } = addressObj
            const balance = balances.native

            return (tag !== "change" && tag !== "P2SH") ||
              (tag === "change" && balance > 0) ||
              (tag === "change" && api.appConfig.general.native.includeEmptyChangeAddrs) ||
              (tag === "P2SH" && api.appConfig.general.native.includeP2shAddrs)
          }))

          //Compile private addresses and addresses not covered by listaddressgroupings
          let fullAddrList = privateAddrListResult.concat(addressesByAccount);

          const totalZBalance = Number(totalBalance.private);
          const totalTBalance = Number(totalBalance.transparent);

          for (let i = 0; i < fullAddrList.length; i++) {
            const address = fullAddrList[i];

            if (!pubAddrsSeen.includes(address)) {
              const addrTag = api.native.getAddressType(address);
              const isZ = addrTag === "sapling" || addrTag === "sprout";
              let balanceObj = { native: 0, reserve: {} };

              try {
                //If balance for type has been reached, stop checking balances, improves performance
                if (
                  (isZ && zBalanceSeen < totalZBalance) ||
                  (!isZ && tBalanceSeen < totalTBalance)
                ) {
                  balanceObj.native = Number(
                    await api.native.get_addr_balance(coin, address, true, txcount, Number(totalBalance.total))
                  );

                  isZ
                    ? (zBalanceSeen += balanceObj.native)
                    : (tBalanceSeen += balanceObj.native);
                } else {
                  balanceObj.native = 0;
                }

                const addrObj = {
                  address,
                  tag: addrTag,
                  balances: balanceObj
                };

                if (
                  addrObj.tag !== "P2SH" ||
                  (addrObj.tag === "P2SH" &&
                    api.appConfig.general.native.includeP2shAddrs)
                ) {
                  isZ
                    ? resObj.private.push(addrObj)
                    : resObj.public.push(addrObj);
                }
              } catch (e) {
                throw e;
              }
            }
          }

          resolve(resObj);
        })
        .catch(err => {
          reject(err);
        });
    });
  };

  api.native.validate_address = (coin, address) => {
    let isZAaddr = false
    if (address[0] === 'z') isZAaddr = true

    return new Promise((resolve, reject) => {
      api.native.callDaemon(coin, isZAaddr ? 'z_validateaddress' : 'validateaddress', [address])
      .then((jsonResult) => {
        resolve(jsonResult)
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  api.native.get_privkey = (coin, address) => {
    let isZAaddr = false
    if (address[0] === 'z') isZAaddr = true

    return new Promise((resolve, reject) => {
      api.native.callDaemon(coin, isZAaddr ? 'z_exportkey' : 'dumpprivkey', [address])
      .then((jsonResult) => {
        resolve(jsonResult)
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  api.native.get_newaddress = (coin, zAddress) => {
    return new Promise((resolve, reject) => {
      api.native.callDaemon(coin, zAddress ? 'z_getnewaddress' : 'getnewaddress', [])
      .then((jsonResult) => {
        resolve(jsonResult)
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  api.setPost('/native/get_newaddress', (req, res, next) => {
    const zAddress = req.body.zAddress;
    const coin = req.body.chainTicker;

    api.native.get_newaddress(coin, zAddress)
    .then((newAddr) => {
      const retObj = {
        msg: 'success',
        result: newAddr,
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

  api.setPost('/native/get_addresses', (req, res, next) => {
    const includePrivate = req.body.includePrivate;
    const coin = req.body.chainTicker;

    api.native.get_addresses(coin, includePrivate)
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

  api.setPost('/native/get_pubkey', (req, res, next) => {
    const coin = req.body.chainTicker;
    const address = req.body.address

    api.native.validate_address(coin, address)
    .then((validation) => {
      if (!validation.pubkey && !validation.scriptPubKey) throw new Error(`No pubkey found for ${address}`)

      const retObj = {
        msg: 'success',
        result: validation.pubkey ? validation.pubkey : validation.scriptPubkey,
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

  api.setPost('/native/get_privkey', (req, res, next) => {
    const coin = req.body.chainTicker;
    const address = req.body.address

    api.native.get_privkey(coin, address)
    .then((privkey) => {
      if (!privkey) throw new Error(`No privkey found for ${address}`)

      const retObj = {
        msg: 'success',
        result: privkey,
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