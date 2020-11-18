const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.start_mining = (coin, numThreads) => {
    return new Promise((resolve, reject) => {      
      api.native.callDaemon(coin, 'setgenerate', [true, numThreads])
      .then(() => {        
        resolve(true)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.native.stop_mining = (coin) => {
    return new Promise((resolve, reject) => {     
      let staking = false

      api.native.callDaemon(coin, 'getmininginfo', [])
      .then((mininginfo) => {
        staking = mininginfo.staking

        return api.native.callDaemon(coin, 'setgenerate', [false])
      })
      .then(() => {
        if (staking) {
          return api.native.callDaemon(coin, 'setgenerate', [true, 0])
        } else {
          return true
        }
      })
      .then(() => {
        resolve(true)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.native.start_staking = (coin) => {
    return new Promise((resolve, reject) => {     
      let numThreads = 0

      api.native.callDaemon(coin, 'getmininginfo', [])
      .then((mininginfo) => {
        numThreads = mininginfo.numthreads

        return api.native.callDaemon(coin, 'setgenerate', [true, 0])
      })
      .then(() => {
        if (numThreads > 0) {
          return api.native.callDaemon(coin, 'setgenerate', [true, numThreads])
        } else {
          return true
        }
      })
      .then(() => {
        resolve(true)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.native.stop_staking = (coin) => {
    return new Promise((resolve, reject) => {     
      let numThreads = 0

      api.native.callDaemon(coin, 'getmininginfo', [])
      .then((mininginfo) => {
        numThreads = mininginfo.numthreads

        return api.native.callDaemon(coin, 'setgenerate', [false])
      })
      .then(() => {
        if (numThreads > 0) {
          return api.native.callDaemon(coin, 'setgenerate', [true, numThreads])
        } else {
          return true
        }
      })
      .then(() => {
        resolve(true)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.setPost('/native/start_mining', (req, res, next) => {
    const { chainTicker, numThreads } = req.body

    api.native.start_mining(chainTicker, numThreads)
    .then(() => {
      const retObj = {
        msg: 'success',
        result: null,
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

  api.setPost('/native/start_staking', (req, res, next) => {
    const { chainTicker } = req.body

    api.native.start_staking(chainTicker)
    .then(() => {
      const retObj = {
        msg: 'success',
        result: null,
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

  api.setPost('/native/stop_mining', (req, res, next) => {
    const { chainTicker } = req.body

    api.native.stop_mining(chainTicker)
    .then(() => {
      const retObj = {
        msg: 'success',
        result: null,
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

  api.setPost('/native/stop_staking', (req, res, next) => {
    const { chainTicker } = req.body

    api.native.stop_staking(chainTicker)
    .then(() => {
      const retObj = {
        msg: 'success',
        result: null,
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