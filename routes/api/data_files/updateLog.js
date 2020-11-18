const {
  UPDATE_LOG,
  UPDATE_LOG_DESC
} = require("../utils/constants/index");

module.exports = (api) => {
  // Blacklist
  api.loadUpdateLog = () =>
    api.loadJsonFile(UPDATE_LOG, UPDATE_LOG_DESC);
  api.saveUpdateLog = (history) =>
    api.saveJsonFile({ time: (new Date()).getTime(), history }, UPDATE_LOG, UPDATE_LOG_DESC);

  api.setGet('/load_update_log', async (req, res, next) => {
    api.loadUpdateLog()
    .then((log) => {
      const retObj = {
        msg: 'success',
        result: log,
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

  api.setPost('/save_update_log', async (req, res, next) => {
    const { history } = req.body
   
    try {
      const retObj = {
        msg: 'success',
        result: await api.saveUpdateLog(history),
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