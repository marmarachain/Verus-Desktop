
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

module.exports = (api) => {
  /**
   * Takes in formatted transactions, and a path to a csv file, and saves the 
   * transaction csv to 'path'
   * @param {Object[]} transactions Array of {type, amount, fee, date, address, confirmations, affected_balance, txid, coin}
   * @param {String} path Directory path
   */
  api.saveTransactionCsv = async (transactions, path) => {
    const csvWriter = createCsvWriter({
      path,
      header: [
          {id: 'type', title: 'Type'},
          {id: 'amount', title: 'Amount'},
          {id: 'fee', title: 'Fee'},
          {id: 'date', title: 'Date'},
          {id: 'address', title: 'Address'},
          {id: 'confirmations', title: 'Confirmations'},
          {id: 'affected_balance', title: 'Balance'},
          {id: 'txid', title: 'TxID'},
          {id: 'coin', title: 'Coin'}
      ]
    });

    await csvWriter.writeRecords(transactions)
  }

  api.setPost('/export_transaction_csv', async (req, res, next) => {
    const { transactions, path } = req.body
   
    try {
      const retObj = {
        msg: 'success',
        result: await api.saveTransactionCsv(transactions, path),
      };

      res.send(JSON.stringify(retObj));
    } catch (e) {
      const retObj = {
        msg: 'error',
        result: e.message,
      };

      res.send(JSON.stringify(retObj));
    }
  });

  return api;
};