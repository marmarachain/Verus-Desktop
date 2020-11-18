const {
  CURRENCY_BLACKLIST,
  CURRENCY_WHITELIST,
  CURRENCY_GRAYLIST,
  WHITELIST_DESC,
  BLACKLIST_DESC,
  GRAYLIST_DESC
} = require("../utils/constants/index");

module.exports = (api) => {
  // Blacklist
  api.loadCurrencyBlacklist = () =>
    api.loadJsonFile(CURRENCY_BLACKLIST, BLACKLIST_DESC);
  api.saveCurrencyBlacklist = (blacklist) =>
    api.saveJsonFile(blacklist, CURRENCY_BLACKLIST, BLACKLIST_DESC);

  // Whitelist
  api.loadCurrencyWhitelist = () =>
    api.loadJsonFile(CURRENCY_WHITELIST, WHITELIST_DESC);
  api.saveCurrencyWhitelist = (whitelist) =>
    api.saveJsonFile(whitelist, CURRENCY_WHITELIST, WHITELIST_DESC);

  api.setGet('/load_currency_blacklist', async (req, res, next) => {
    api.loadCurrencyBlacklist()
    .then((blacklist) => {
      const retObj = {
        msg: 'success',
        result: blacklist,
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

  api.setGet('/load_currency_whitelist', (req, res, next) => {
    api.loadCurrencyWhitelist()
    .then((whitelist) => {
      const retObj = {
        msg: 'success',
        result: whitelist,
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

  api.setPost('/save_currency_blacklist', async (req, res, next) => {
    const { blacklist } = req.body
   
    try {
      const retObj = {
        msg: 'success',
        result: await api.saveCurrencyBlacklist(blacklist),
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

  api.setPost('/save_currency_whitelist', async (req, res, next) => {
    const { whitelist } = req.body
   
    try {
      const retObj = {
        msg: 'success',
        result: await api.saveCurrencyWhitelist(whitelist),
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

  // Graylist (moved to native api, and called on interval due to expected change of getting this data from blockchain)
  api.loadCurrencyGraylist = () => api.loadJsonFile(CURRENCY_GRAYLIST, GRAYLIST_DESC)
  api.saveCurrencyGraylist = (graylist) => api.saveJsonFile(graylist, CURRENCY_GRAYLIST, GRAYLIST_DESC)

  return api;
};