const Promise = require('bluebird');

const PRIVATE_ADDRESSES = 1
const PUBLIC_TRANSACTIONS = 0
const NUM_BLOCK_INDEX = 2
const MAX_TRANSACTIONS = 2147483647 // Max # of transactions

module.exports = api => {
  const getZTransactions = (coin, array, currentHeight) => {
    let promiseArray = [];
    for (let i = 0; i < array.length; i++) {
      promiseArray.push(
        new Promise((resolve, reject) => {
          api.native
            .get_transaction(coin, array[i].txid, true, currentHeight)
            .then(__json => {
              resolve(__json);
            });
        })
      );
    }
    return Promise.all(promiseArray);
  };

  const getZTransactionGroups = (coin, array, results, currentHeight) => {
    let txInputGroups = [{ coin: coin, group: array.slice(0, 100) }];
    let numCounted = txInputGroups[0].group.length;

    while (numCounted < array.length) {
      txInputGroups.push({
        coin: coin,
        group: array.slice(numCounted, numCounted + 100)
      });
      numCounted += txInputGroups[txInputGroups.length - 1].group.length;
    }

    return txInputGroups.reduce((p, a) => {
      return p.then(chainResults => {
        return getZTransactions(a.coin, a.group, currentHeight).then(txGroup => {
          return chainResults.concat(txGroup);
        });
      });
    }, Promise.resolve(results));
  };

  api.native.get_transactions = (
    coin,
    includePrivate,
    maxPubTransactions = MAX_TRANSACTIONS
  ) => {
    let privateAddresses = [];
    let transactions = [];
    let currentHeight = null

    return new Promise((resolve, reject) => {
      let transactionPromises = [
        api.native.callDaemon(
          coin,
          "listtransactions",
          ["*", maxPubTransactions]
        )
      ];
      if (includePrivate) {
        transactionPromises.push(
          api.native.callDaemon(coin, "z_listaddresses", [])
        );
        transactionPromises.push(
          api.native.callDaemon(coin, "getinfo", [])
        );
      }
        

      Promise.all(transactionPromises)
        .then(jsonResults => {
          jsonResults.map((result, index) => {
            if (index === PUBLIC_TRANSACTIONS) {
              // Filter out extra two transactions associated with each stake
              transactions = result.filter(tx => {
                if (tx.category === "stake") {
                  if (tx.amount > 0) {
                    return true;
                  } else {
                    return false;
                  }
                } else {
                  return true;
                }
              });
            } else if (index === PRIVATE_ADDRESSES) {
              privateAddresses = result;
            } else if (index === NUM_BLOCK_INDEX) {
              currentHeight = result.longestchain
            }
          });

          return Promise.all(
            privateAddresses.map(address => {
              return api.native.callDaemon(
                coin,
                "z_listreceivedbyaddress",
                [address, 0]
              );
            })
          );
        })
        .then(receivedByAddressList => {
          const privateTxs = receivedByAddressList
            .map((receivedByAddressArray, addressIndex) => {
              return receivedByAddressArray.map(privTx => {
                return {
                  ...privTx,
                  address: privateAddresses[addressIndex],
                  category: "receive"
                };
              });
            })
            .flat();

          return privateTxs.length > 0
            ? getZTransactionGroups(coin, privateTxs, [privateTxs], currentHeight)
            : [[]];
        })
        .then(gottenTransactionsArray => {
          const privateTxs = gottenTransactionsArray.shift();

          gottenTransactionsArray.map((tx, index) => {
            const completeTx = { ...tx, ...privateTxs[index] };
            transactions.push(completeTx);
          });

          resolve(transactions);
        })
        .catch(err => {
          reject(err);
        });
    });
  };

  api.setPost("/native/get_transactions", (req, res, next) => {
    const includePrivate = req.body.includePrivate;
    const maxPubTransactions = req.body.maxPubTransactions;
    const coin = req.body.chainTicker;

    api.native
      .get_transactions(coin, includePrivate, maxPubTransactions)
      .then(transactions => {
        const retObj = {
          msg: "success",
          result: transactions
        };

        res.send(JSON.stringify(retObj));
      })
      .catch(error => {
        const retObj = {
          msg: "error",
          result: error.message
        };

        res.send(JSON.stringify(retObj));
      });
  });

  return api;
};;