module.exports = (api) => {  
  api.setGet('/electrum/get_info', (req, res, next) => {
    if (!req.query.chainTicker) {
      res.send(JSON.stringify({
        msg: 'error',
        result: 'No coin passed to electrum get_info'
      }));
    }
    const coinLc = req.query.chainTicker.toLowerCase();

    if (!api.electrum.coinData[coinLc]) {
      res.send(JSON.stringify({
        msg: 'error',
        result: `No coin data found for ${req.query.chainTicker}`
      }));
    }

    const { name, txfee, server, serverList, nspv } = api.electrum.coinData[coinLc];

    res.send(JSON.stringify({msg: 'success', result: nspv ? {
      protocol: "nSPV",
      name,
      txfee,
      server: `${server.ip}:${server.port}:${server.proto}`,
      serverList: serverList.toString(),
    } : {
      protocol: "Electrum",
      name,
      txfee,
      server: `${server.ip}:${server.port}:${server.proto}`,
      serverList: serverList.toString(),
      nspv,
    }}));
      
    const coin = req.query.chainTicker;
    let retObj = {}

    try {
      retObj = {
        msg: 'success',
        result: api.electrum.get_info(coin)
      }
    } catch (e) {
      retObj = {
        msg: 'error',
        result: e.message
      }
    }
    
    res.send(JSON.stringify(retObj));  
  });

  return api;
};