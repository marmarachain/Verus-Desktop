module.exports = (api) => {
  api.native.activateNativeCoin = (
    coin,
    startupOptions = [],
    daemon,
    fallbackPort,
    dirNames,
    confName,
    tags = []
  ) => {
    let acOptions = []
    const chainParams = api.chainParams[coin];
    if (tags.includes('is_komodo')) api.customKomodoNetworks[coin.toLowerCase()] = true

    for (let key in chainParams) {
      if (typeof chainParams[key] === "object") {
        for (let i = 0; i < chainParams[key].length; i++) {
          acOptions.push(`-${key}=${chainParams[key][i]}`);
        }
      } else {
        acOptions.push(`-${key}=${chainParams[key]}`);
      }
    }

    acOptions = acOptions.concat(startupOptions);

    return new Promise((resolve, reject) => {
      api
        .startDaemon(coin, acOptions, daemon, dirNames, confName, fallbackPort)
        .then(() => {
          // Set timeout for "No running daemon message" to be
          // "Initializing daemon" for a few seconds
          api.coinsInitializing.push(coin);

          setTimeout(() => {
            api.coinsInitializing.splice(
              api.coinsInitializing.indexOf(coin),
              1
            );
          }, 20000);

          api.log(
            `${coin} daemon activation started successfully, waiting on daemon response...`,
            "native.confd"
          );

          resolve()
        })
        .catch(err => {
          api.log(`${coin} failed to activate, error:`, "native.confd");
          api.log(err.message, "native.confd");

          reject(err)
        });
    });
  };

  /**
   * Function to activate coin daemon in native mode
   */
  api.setPost('/native/coins/activate', (req, res) => {
    const { chainTicker, launchConfig } = req.body
    let {
      startupOptions,
      daemon,
      fallbackPort,
      dirNames,
      confName,
      tags,
    } = launchConfig;

    if (
      api.appConfig.coin.native.stakeGuard[chainTicker] &&
      api.appConfig.coin.native.stakeGuard[chainTicker].length > 0
    ) {
      startupOptions.push(`-cheatcatcher=${api.appConfig.coin.native.stakeGuard[chainTicker]}`)
    }

    api.native
      .activateNativeCoin(
        chainTicker,
        startupOptions,
        daemon,
        fallbackPort,
        dirNames,
        confName,
        tags
      )
      .then(result => {
        const retObj = {
          msg: "success",
          result
        };

        res.send(JSON.stringify(retObj));
      })
      .catch(e => {
        const retObj = {
          msg: "error",
          result: e.message
        };
        
        res.send(JSON.stringify(retObj));
      });
  });

  return api;
};