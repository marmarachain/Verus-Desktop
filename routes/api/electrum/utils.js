module.exports = (api) => {
  api.sortTransactions = (transactions, sortBy) => {
    if (transactions && typeof transactions === 'object' && transactions[0]) {
      return transactions.sort((b, a) => {
        if (a[sortBy ? sortBy : 'height'] < b[sortBy ? sortBy : 'height'] &&
            a[sortBy ? sortBy : 'height'] &&
            b[sortBy ? sortBy : 'height']) {
          return -1;
        }

        if (a[sortBy ? sortBy : 'height'] > b[sortBy ? sortBy : 'height'] &&
            a[sortBy ? sortBy : 'height'] &&
            b[sortBy ? sortBy : 'height']) {
          return 1;
        }

        if (!a[sortBy ? sortBy : 'height'] &&
            b[sortBy ? sortBy : 'height']) {
          return 1;
        }

        if (!b[sortBy ? sortBy : 'height'] &&
            a[sortBy ? sortBy : 'height']) {
          return -1;
        }

        return 0;
      });
    } else {
      return transactions;
    }
  }

  return api;
};