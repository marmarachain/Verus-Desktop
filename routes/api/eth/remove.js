module.exports = (api) => {
  api.setPost('/eth/remove_coin', (req, res) => {
    const _chain = req.body.chainTicker

    delete api.eth.coins[_chain.toUpperCase()];
    
    if (Object.keys(api.eth.coins).length === 0) {
      api.eth.coins = null;
      api.eth.wallet = null;
      api.eth.connect = null;
    }

    const retObj = {
      msg: 'success',
      result: true,
    };

    res.send(JSON.stringify(retObj));
  });

  return api;
};
