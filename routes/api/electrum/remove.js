module.exports = (api) => {
  api.setPost('/electrum/remove_coin', (req, res) => {
    const _chain = req.body.chainTicker;

    api.stopNSPVDaemon(_chain.toLowerCase());

    delete api.electrum.coinData[_chain.toLowerCase()];
    
    if (Object.keys(api.electrum.coinData).length === 0) {
      api.electrumKeys = {};
    }

    api.eclManagerClear(_chain.toLowerCase());

    const retObj = {
      msg: 'success',
      result: true,
    };

    res.send(JSON.stringify(retObj));
  });

  return api;
};
