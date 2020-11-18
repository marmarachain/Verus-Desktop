const { extractReserveTransfers } = require("../utils/cryptoConditions/cryptoConditionTxUtil");
const { RPC_WALLET_INSUFFICIENT_FUNDS } = require("../utils/rpc/rpcStatusCodes");

module.exports = (api) => {  
  api.native.encodeMemo = (memo) => {
    return Array.from(memo).map(c => 
      c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16).padStart(2, '0') :
      encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
    ).join('');
  }

  api.native.testSendCurrency = async (chainTicker, txParams) => {
    const rawtx = await api.native.callDaemon(
      chainTicker,
      "sendcurrency",
      [...txParams, true]
    )

    return await api.native.callDaemon(
      chainTicker,
      "decoderawtransaction",
      [rawtx]
    )
  }

  /**
   * Function to create object that gets passed to sendtx. This object is 
   * also used to display confirmation data to the user. The resulting
   * object contains information about the transaction, as well as parameters (txParams)
   * that will get passed to sendtx
   * @param {String} chainTicker (required) The chain ticker to send from
   * @param {String} toAddress (required) The address or id to send to
   * @param {Number} amount (optional, default = 0) The amount to send, leave blank for message transactions
   * @param {Number} balance (required) The balance in the balance that is going to be sent from
   * @param {String} fromAddress (optional, if no custom fee or z_addresses involved) The address to send from, or in a pre-convert, the refund address
   * @param {Number} customFee (optional, forces fromAddress) The custom fee to send with the transaction
   * @param {String} memo (optional, forces send to z_address) The memo to include with the transaction to be sent to the receiver
   * @param {Object} currencyParams (optional) Parameters for PBaaS sendcurrency API that arent deduced from above, e.g. { currency: "VRSCTEST", convertto: "test", preconvert: true }
   */
  api.native.txPreflight = async (
    chainTicker,
    toAddress,
    amount = 0,
    balance,
    fromAddress,
    customFee,
    memo,
    currencyParams
  ) => {
    let cliCmd
    let txParams
    let warnings = []
    let price
    let conversionValue
    let fromCurrency
    let toCurrency
    let mint = false

    let isSendCurrency =
      currencyParams != null &&
      currencyParams.currency != null &&
      (currencyParams.currency != chainTicker ||
        (currencyParams.currency === chainTicker &&
          currencyParams.convertto != null &&
          currencyParams.convertto !== currencyParams.currency));

    //TODO: Change for sendcurrency to account for 0.25% fee
    let fee = isSendCurrency ? 0.0003 : 0.0001
    let spendAmount = amount
    let deductedAmount

    // Pre-processing for fee purposes
    if (isSendCurrency) {
      if (currencyParams.mintnew) {
        spendAmount = 0
      }
      
      if (
        currencyParams.currency != null &&
        currencyParams.convertto != null &&
        currencyParams.currency !== currencyParams.convertto
      ) {
        fee += (spendAmount * 0.00025);
      }
    } 

    deductedAmount = Number((spendAmount + fee).toFixed(8))

    try {
      const balances = await api.native.get_balances(chainTicker, false)
      const { interest } = balances.native.public

      if (deductedAmount > balance) {
        if (interest == null || interest == 0) {
          warnings.push({
            field: "value",
            message: `Original amount + est. fee (${deductedAmount}) is larger than balance, amount has been changed.`
          });
        }
        
        spendAmount = Number((spendAmount - fee).toFixed(8));
        deductedAmount = Number((spendAmount + fee).toFixed(8));
      }
  
      if (isSendCurrency) {
        const { currency, convertto, refundto, preconvert, subtractfee, mintnew } = currencyParams
        cliCmd = "sendcurrency";
        
        try {
          fromCurrency = await api.native.get_currency(
            chainTicker,
            currency == null ? chainTicker : currency
          );
          
          if (convertto != null && convertto !== currency) {
            toCurrency = await api.native.get_currency(chainTicker, convertto)            
            currentHeight = await api.native.get_info(chainTicker).longestchain

            if (currentHeight < toCurrency.startblock && !preconvert) {
              throw new Error("Preconvert expired! You can no longer preconvert this currency.")
            }

            if (
              toCurrency.bestcurrencystate != null &&
              toCurrency.bestcurrencystate.currencies[
                fromCurrency.currencyid
              ] != null
            ) {
              price = toCurrency.bestcurrencystate.currencies[fromCurrency.currencyid].lastconversionprice;
              conversionValue = spendAmount * (1 / price)
            } else if (
              fromCurrency.bestcurrencystate != null &&
              fromCurrency.bestcurrencystate.currencies[
                toCurrency.currencyid
              ] != null
            ) {
              price = 1 / fromCurrency.bestcurrencystate.currencies[toCurrency.currencyid].lastconversionprice;
              conversionValue = spendAmount * (1 / price)
            } else {
              throw new Error(
                `Conversion between ${toCurrency.name} and ${fromCurrency.name} is not possible.`
              );
            }
          }
        } catch (e) {
          api.log("Error while trying to fetch currencies for sendcurrency!", "send")
          api.log(e, "send")

          throw e
        }
        
        mint = mintnew
        txParams = [
          fromAddress == null ? "*" : fromAddress,
          [{
            currency,
            convertto,
            refundto,
            preconvert,
            subtractfee,
            amount: spendAmount,
            address: toAddress,
            memo,
            mintnew
          }]
        ];

        // Extract reserve transfer outputs
        try {
          sendCurrencyTest = await api.native.testSendCurrency(chainTicker, txParams)
        } catch(e) {
          if (e.message === 'Insufficient funds' && mint) {
            e.message = `Insufficient funds. To mint coins, ensure that the identity that created this currency (${fromAddress}) has at least a balance of 0.0002 ${chainTicker}.`
          } else {
            api.log("Error while testing currency send!", "send")
            api.log(e, "send")
            throw e
          }
        }
        // Ensure values from decoded tx match input values

        // TODO: Fix once extractReserveTransfers is moved to 
        // cryptoConditions.js
        
        /*
        let reserveTransfer = extractReserveTransfers(sendCurrencyTest)[0]
        
        if (reserveTransfer == null)
          throw new Error(
            "Failed to create and verify reserve transfer transaction."
          );
        else if (
          reserveTransfer.preconvert != preconvert ||
          (convertto !== currency && !reserveTransfer.convert) || 
          (toCurrency != null && (toCurrency.currencyid !== reserveTransfer.destinationcurrencyid)) ||
          (fromCurrency != null && (fromCurrency.currencyid !== reserveTransfer.currencyid))
        ) {
          throw new Error(
            "Failed to verify that sendcurrency input data matches what is going to be sent."
          );
        }*/
      } else if (fromAddress || toAddress[0] === "z" || customFee != null) {
        cliCmd = "z_sendmany";
        if (customFee) fee = customFee;
        if (!fromAddress) throw new Error("You must specify a from address in a private transaction.")
  
        txParams = [
          fromAddress,
          [
            {
              address: toAddress,
              amount: spendAmount
            }
          ],
          1,
          fee
        ];

        if (memo) {
          if (toAddress[0] !== 'z') throw new Error("Memos can only be attached to transactions going to z addresses.")
          txParams[1][0].memo = api.native.encodeMemo(memo);
        }
      } else {
        cliCmd = "sendtoaddress";
        txParams = [toAddress, spendAmount];
      }
      
      let remainingBalance = balance != null && deductedAmount != null ? (balance - deductedAmount).toFixed(8) : 0

      if (remainingBalance < 0) throw new Error("Insufficient funds")
  
      if (interest != null && interest > 0) {
        if (cliCmd !== "sendtoaddress") {
          warnings.unshift({
            field: "interest",
            message:
              `You have ${interest} ${chainTicker} in unclaimed interest that may be lost if you send this transaction, ` +
              `claim it first to ensure you do not lose it.`
          });
        } else {
          remainingBalance = (Number(remainingBalance) + (2 * interest)).toFixed(8)
          deductedAmount -= interest
        }
      } 

      return {
        cliCmd,
        txParams,
        chainTicker,
        to: toAddress,
        from: mint
          ? `The "${fromCurrency.name}" Mint (${fromCurrency.name}@)`
          : fromAddress
          ? fromAddress
          : cliCmd === "sendtoaddress" || cliCmd === "sendcurrency"
          ? "Transparent Funds"
          : null,
        balance: balance ? balance.toFixed(8) : balance,
        value: spendAmount,
        interest: interest == null || interest == 0 ? null : interest,
        fee: fee ? fee.toFixed(8) : fee,
        message: memo,
        total: deductedAmount ? deductedAmount.toFixed(8) : deductedAmount,
        remainingBalance,
        warnings,
        price,
        conversionValue,
        fromCurrency,
        toCurrency,
        mint
      };
    } catch (e) {
      throw e
    }
  };

  api.setPost('/native/sendtx', async (req, res, next) => {
    const {
      chainTicker,
      toAddress,
      amount,
      balance,
      fromAddress,
      customFee,
      memo,
      currencyParams
    } = req.body;

    try {
      const preflightRes = await api.native.txPreflight(
        chainTicker,
        toAddress,
        amount,
        balance,
        fromAddress,
        customFee,
        memo,
        currencyParams
      )

      api.native.callDaemon(chainTicker, preflightRes.cliCmd, preflightRes.txParams)
      .then(txid => {
        const retObj = {
          msg: "success",
          result: { ...preflightRes, txid }
        };
        res.send(JSON.stringify(retObj));
      }).catch(e => {
        const retObj = {
          msg: "error",
          result: e.message
        };
        res.send(JSON.stringify(retObj));
      })
    } catch (e) {
      const retObj = {
        msg: "error",
        result: e.message
      };

      res.send(JSON.stringify(retObj));
    }
  });

  api.setPost("/native/tx_preflight", async (req, res, next) => {
    const {
      chainTicker,
      toAddress,
      amount,
      balance,
      fromAddress,
      customFee,
      memo,
      currencyParams
    } = req.body;

    try {
      res.send(
        JSON.stringify({
          msg: "success",
          result: await api.native.txPreflight(
            chainTicker,
            toAddress,
            amount,
            balance,
            fromAddress,
            customFee,
            memo,
            currencyParams
          )
        })
      );
    } catch (e) {
      const retObj = {
        msg: "error",
        result: e.message
      };
      res.send(JSON.stringify(retObj));
    }
  });
    
  return api;
};