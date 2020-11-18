const fs = require('fs-extra');

module.exports = (api) => {
  api.loadCoinsListFromFile = async () => {
    try {
      if (fs.existsSync(`${api.paths.agamaDir}/shepherd/coinslist.json`)) {
        const _coinsList = JSON.parse(fs.readFileSync(`${api.paths.agamaDir}/shepherd/coinslist.json`, 'utf8'));

        for (let i = 0; i < _coinsList.length; i++) {
          const _coin = _coinsList[i].selectedCoin.split('|');

          if (_coinsList[i].spvMode.checked) {
            const addCoin = await api.addElectrumCoin(_coin[0]);
            api.log(`add spv coin ${_coin[0]} from file`, 'spv.coins');
          }
        }
      }
    } catch (e) {
      api.log(e, 'spv.coins');
    }
  }

  /*
   *  type: POST
   *  params: payload
   */
  api.setPost('/coinslist', (req, res, next) => {
    const _payload = req.body.payload;

    if (!_payload) {
      const retObj = {
        msg: 'error',
        result: 'no payload provided',
      };

      res.send(JSON.stringify(retObj));
    } else {
      fs.writeFile(`${api.paths.agamaDir}/shepherd/coinslist.json`, JSON.stringify(_payload), (err) => {
        if (err) {
          const retObj = {
            msg: 'error',
            result: err,
          };

          res.send(JSON.stringify(retObj));
        } else {
          const retObj = {
            msg: 'success',
            result: 'done',
          };

          res.send(JSON.stringify(retObj));
        }
      });
    }
  });

  return api;
};