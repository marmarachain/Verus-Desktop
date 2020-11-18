const fs = require('fs-extra');
const Promise = require('bluebird');
const { secondsToString } = require('agama-wallet-lib/src/time');

module.exports = (api) => {
  api.log = (msg, type) => {
    if (api.appConfig.general.main.dev ||
        api.appConfig.general.main.debug ||
        process.argv.indexOf('devmode') > -1) {
      if (type) {
        console.log(`\x1b[94m${type}`, '\x1b[0m', msg);
      } else {
        console.log(msg);
      }
    }

    api.appRuntimeLog.push({
      time: Date.now(),
      msg: msg,
      type: type,
    });
  }

  api.writeLog = (data) => {
    const logLocation = `${api.paths.agamaDir}/shepherd`;
    const timeFormatted = new Date(Date.now()).toLocaleString('en-US', { hour12: false });

    if (api.appConfig.general.main.debug) {
      if (fs.existsSync(`${logLocation}/agamalog.txt`)) {
        fs.appendFile(`${logLocation}/agamalog.txt`, `${timeFormatted}  ${data}\r\n`, (err) => {
          if (err) {
            api.log('error writing log file');
          }
        });
      } else {
        fs.writeFile(`${logLocation}/agamalog.txt`, `${timeFormatted}  ${data}\r\n`, (err) => {
          if (err) {
            api.log('error writing log file');
          }
        });
      }
    }
  }

  api.getAppRuntimeLog = () => {
    return new Promise((resolve, reject) => {
      resolve(api.appRuntimeLog);
    });
  };

  api.printDirs = () => {
    api.log("DIR PATHS:", 'env')
    api.writeLog("DIR PATHS:")
    for (const pathType in api.paths) {
      api.log(`${pathType}: ${api.paths[pathType]}`, 'env')
      api.writeLog(`${pathType}: ${api.paths[pathType]}`);
    }
  }

  return api;
};