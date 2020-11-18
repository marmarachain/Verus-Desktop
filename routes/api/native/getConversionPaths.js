
const Promise = require('bluebird');
const { IS_FRACTIONAL } = require('../utils/constants/currency_flags');
const checkFlag = require('../utils/flags');

module.exports = (api) => {    
  // Derives possible conversion paths between source and destination currencies
  // (or all possible destinations if destination is null)
  api.native.get_conversion_paths = (chain, src, dest = null) => {
    return new Promise(async (resolve, reject) => {  
      try {
        const source = await api.native.get_currency(chain, src)

        api.native.callDaemon(chain, 'getcurrencyconverters', dest === null ? [src] : [src, dest])
        .then(async (paths) => {
          let convertables = {} 

          paths.forEach(path => {
            const currencyName = Object.keys(path)[0]
            convertables[path[currencyName].currencyid] = path[currencyName]
          })

          if (checkFlag(source.options, IS_FRACTIONAL) && dest == null) {
            for (const reserve of source.currencies) {
              if (!convertables[reserve]) {
                convertables[reserve] = await api.native.get_currency(chain, reserve)
              }
            }
          }

          resolve(convertables)
        })
        .catch(err => {
          reject(err)
        })
      } catch(e) {
        reject(e)
      }
    });
  };

  api.setPost('/native/get_conversion_paths', (req, res, next) => {
    const coin = req.body.chainTicker;
    const src = req.body.src;
    const dest = req.body.dest;

    api.native.get_conversion_paths(coin, src, dest)
    .then((paths) => {  
      res.send(JSON.stringify({
        msg: 'success',
        result: paths,
      }));  
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