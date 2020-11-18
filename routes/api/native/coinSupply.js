const Promise = require('bluebird');

module.exports = (api) => {  
  /* loadingState = {
    status: 'loading',
    totalBlocks: <number of blocks in longest chain>,
    loadedBlocks: <number of blocks cached so far>,
    timeTaken: <time taken for last loading tick>
  }*/

  api.native.coinSupplyLoadingStates = {}

  api.native.get_coinsupply = (coin, height) => {
    return new Promise((resolve, reject) => {
      api.native.callDaemon(coin, 'coinsupply', height == null ? [] : [height.toString()])
      .then((coinSupply) => {
        if (coinSupply.error != null) reject(new Error(coinSupply.error))
        
        resolve(coinSupply)
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.native.get_currentsupply = (coin) => {
    const loadingState = api.native.coinSupplyLoadingStates[coin]

    const loadSupply = (loadingState) => {
      // Record time before fetch started
      const preTs = new Date().getTime()

      api.native
        .get_info(coin)
        .then(chainInfo => {
          const { longestchain, blocks } = chainInfo;

          if (longestchain != blocks) throw new Error('Cannot get coin supply, still syncing...')

          loadingState.totalBlocks = longestchain;
          loadingState.loadedBlocks =
            longestchain < 5000 && longestchain != 0
              ? longestchain
              : loadingState.loadedBlocks == null
              ? 5000
              : loadingState.loadedBlocks + 5000;

          return api.native.get_coinsupply(
            coin,
            loadingState.loadedBlocks
          );
        })
        .then(coinSupply => {
          // We dont need to use coinsupply data, we are just doing this to cache it

          const blockDiff =
            loadingState.totalBlocks - loadingState.loadedBlocks;
          loadingState.status =
            blockDiff < 5000 &&
            (blockDiff > 0 ||
              (blockDiff == 0 && loadingState.totalBlocks != 0 && loadingState.totalBlocks < 5000))
              ? "ready"
              : "loading";

          // Calculate time taken to get coins supply for 5000 blocks and set timeout to repeat next 5000 block
          // in that time if still loading(to avoid clogging up daemon)
          loadingState.timeTaken = new Date().getTime() - preTs;

          api.native.coinSupplyLoadingStates[coin] = loadingState;

          if (loadingState.status == "loading") {
            setTimeout(() => loadSupply(loadingState), loadingState.timeTaken);
          }
        })
        .catch(e => {
          loadingState.status = "error";
          api.log(e.message, 'coinSupply');
          api.native.coinSupplyLoadingStates[coin] = loadingState;
        });
    }

    // If process of caching coin supply hasnt begun, start caching coin supply
    if (loadingState == null || loadingState.status === 'error') {
      loadSupply({
        status: 'loading',
        totalBlocks: null,
        loadedBlocks: null,
        timeTaken: null
      })
    } else if (loadingState.status === 'ready') {
      return new Promise((resolve, reject) => {
        api.native.get_coinsupply(coin)
        .then(coinSupply => {
          resolve({ ...coinSupply, loadingState, source: 'native' })
        })
        .catch(e => reject(e))
      })
    }

    return new Promise((resolve, reject) => {
      api.get_coinsupply(coin)
      .then(coinSupply => {
        resolve({ ...coinSupply, loadingState, source: 'http/https' })
      })
      .catch(e => {
        if (e.message.includes('HTTP/HTTPS coin supply function not found')) {
          reject(new Error('Loading...'))
        } else {
          reject(e)
        }
      })
    })
  }

  api.setPost('/native/get_currentsupply', (req, res, next) => {
    const coin = req.body.chainTicker;

    api.native.get_currentsupply(coin)
    .then((coinSupply) => {
      const retObj = {
        msg: 'success',
        result: coinSupply,
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