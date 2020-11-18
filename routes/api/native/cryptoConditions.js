
const Promise = require('bluebird');

module.exports = (api) => {    
  //TODO: Finish when API call for estimatefee is completed
  api.native.parse_reserve_transfer = async (chainTicker, rawTx) => {
    let totalIn, totalOut, totalTransferFees, totalNetworkFees, conversionFee = 0
    let isConversion, currencyNotChainticker = false

    const decodedTx = await api.native.callDaemon(
      chainTicker,
      "decoderawtransaction",
      [rawTx]
    );

    let outs = decodedTx.vout
    let ins = decodedTx.vin

    for (let i = 0; i < outs.length; i++) {
      let output = outs[i]

      if (
        output.scriptPubKey != null &&
        output.scriptPubKey.type === "cryptocondition" &&
        output.scriptPubKey.reservetransfer != null
      ) {
        totalOut += (output.scriptPubKey.reservetransfer.value + output.scriptPubKey.reservetransfer.fees)
        totalTransferFees += output.scriptPubKey.reservetransfer.fees

        if (!currencyNotChainticker && await api.native.get_currency(chain, currency).name !== chainTicker) {
          currencyNotChainticker = true
        }

        if (!isConversion && output.scriptPubKey.reservetransfer.convert) {
          isConversion = true
        }
      }
    }   
    
    for (let i = 0; i < ins.length; i++) {
      let input = ins[i]

      if (input.txid != null) {
        const inputTx = await api.native.callDaemon(
          chainTicker,
          "decoderawtransaction",
          [await api.native.callDaemon(
            chainTicker,
            "getrawtransaction",
            [input.txid]
          )]
        );

        let inouts = inputTx.vout

        for (let i = 0; i < inouts.length; i++) {
          let output = inouts[i]
    
          if (
            currencyNotChainticker &&
            output.scriptPubKey != null &&
            output.scriptPubKey.type === "cryptocondition" &&
            output.scriptPubKey.reservetransfer != null
          ) {
            totalOut += (output.scriptPubKey.reservetransfer.value + output.scriptPubKey.reservetransfer.fees)
            totalTransferFees += output.scriptPubKey.reservetransfer.fees
    
            if (!currencyNotChainticker && await api.native.get_currency(chain, currency).name !== chainTicker) {
              currencyNotChainticker = true
            }
    
            if (!isConversion && output.scriptPubKey.reservetransfer.convert) {
              isConversion = true
            }
          } else if (!currencyNotChainticker && 
            output.scriptPubKey != null &&
            output.scriptPubKey.value) {
              // TODO: Finish calculating fee
            }
        }   
      }
    }
  };

  return api;
};