const sha256 = require('js-sha256');
const buggySha256 = require('sha256');
const bip39 = require('bip39');
const bigi = require('bigi');
const bitcoin = require('bitgo-utxo-lib');
const bs58check = require('bs58check');
const wif = require('wif');
const {
  seedToPriv,
  getAddressVersion,
  addressVersionCheck,
} = require('agama-wallet-lib/src/keys');
const networks = require('agama-wallet-lib/src/bitcoinjs-networks');

module.exports = (api) => {
  api.wifToWif = (wif, network) => {
    const _network = api.getNetworkData(network.toLowerCase());
    const key = new bitcoin.ECPair.fromWIF(wif, _network, true);

    return {
      pub: key.getAddress(),
      priv: key.toWIF(),
      pubHex: key.getPublicKeyBuffer().toString('hex'),
      fromWif: api.fromWif(wif, _network),
    };
  }

  // src: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/ecpair.js#L62
  api.fromWif = (string, network, checkVersion) => {
    const decoded = wif.decode(string);
    const version = decoded.version;

    if (!network) throw new Error('Unknown network version');

    if (checkVersion) {
      if (!network) throw new Error('Unknown network version');
      if (network.wifAlt && version !== network.wif && network.wifAlt.indexOf(version) === -1) throw new Error('Invalid network version');
      if (!network.wifAlt && version !== network.wif) throw new Error('Invalid network version');
    }

    const d = bigi.fromBuffer(decoded.privateKey);

    const masterKP = new bitcoin.ECPair(d, null, {
      compressed: !decoded.compressed,
      network,
    });

    if (network.wifAlt) {
      let altKP = [];

      for (let i = 0; i < network.wifAlt.length; i++) {
        let _network = JSON.parse(JSON.stringify(network));
        _network.wif = network.wifAlt[i];

        const _altKP = new bitcoin.ECPair(d, null, {
          compressed: !decoded.compressed,
          network: _network,
        });

        altKP.push({
          pub: _altKP.getAddress(),
          priv: _altKP.toWIF(),
          version: network.wifAlt[i],
        });
      }

      return {
        inputKey: decoded,
        master: {
          pub: masterKP.getAddress(),
          priv: masterKP.toWIF(),
          version: network.wif,
        },
        alt: altKP,
      };
    } else {
      return {
        inputKey: decoded,
        master: {
          pub: masterKP.getAddress(),
          priv: masterKP.toWIF(),
          version: network.wif,
        },
      };
    }
  };

  api.seedToWif = (seed, network, iguana) => {
    let bytes;

    // legacy seed edge case
    if (process.argv.indexOf('spvold=true') > -1) {
      bytes = buggySha256(seed, { asBytes: true });
    } else {
      const hash = sha256.create().update(seed);
      bytes = hash.array();
    }

    if (iguana) {
      bytes[0] &= 248;
      bytes[31] &= 127;
      bytes[31] |= 64;
    }

    const d = bigi.fromBuffer(bytes);
    const _network = network.hasOwnProperty('pubKeyHash') ? network : api.getNetworkData(network.toLowerCase());
    let keyPair = new bitcoin.ECPair(d, null, { network: _network });
    let keys = {
      pub: keyPair.getAddress(),
      priv: keyPair.toWIF(),
      pubHex: keyPair.getPublicKeyBuffer().toString('hex'),
      fromWif: api.fromWif(keyPair.toWIF(), _network),
    };

    let isWif = false;

    try {
      bs58check.decode(seed);
      isWif = true;
    } catch (e) {}

    if (isWif) {
      try {
        keyPair = new bitcoin.ECPair.fromWIF(seed, _network, true);
        keys = {
          priv: keyPair.toWIF(),
          pub: keyPair.getAddress(),
          pubHex: keyPair.getPublicKeyBuffer().toString('hex'),
          fromWif: api.fromWif(keyPair.toWIF(), _network),
        };
      } catch (e) {}
    }

    return keys;
  }

  api.pubkeyToAddress = (pubkey, coin) => {
    try {
      const publicKey = new Buffer(pubkey, 'hex');
      const publicKeyHash = bitcoin.crypto.hash160(publicKey);
      const _network = api.electrumJSNetworks[coin];
      const address = bitcoin.address.toBase58Check(publicKeyHash, _network.pubKeyHash);
      api.log(`convert pubkey ${pubkey} -> ${address}`, 'pubkey');
      return address;
    } catch (e) {
      api.log('convert pubkey error: ' + e);
      return false;
    }
  };

  api.getCoinByPub = (address, coin) => {
    const _skipNetworks = [
      'btc',
      'crw',
      'dgb',
      'arg',
      'zec',
      'nmc',
      'ltc',
      'vtc',
      'via',
      'fair',
      'doge',
      'kmd',
      'mona',
    ];

    try {
      const _b58check = bitcoin.address.fromBase58Check(address);
      let _coin = [];

      for (let key in api.electrumJSNetworks) {
        if (_b58check.version === api.electrumJSNetworks[key].pubKeyHash &&
            !_skipNetworks.find((item) => { return item === key ? true : false })) {
          _coin.push(key);
        }
      }

      if (_coin.length) {
        return {
          coin: _coin,
          version: _b58check.version,
        };
      } else {
        return 'Unable to find matching coin version';
      }
    } catch (e) {
      return 'Invalid pub address';
    }
  };

  api.setGet('/electrum/keys/addressversion', (req, res, next) => {
    const retObj = {
      msg: 'success',
      result: getAddressVersion(req.query.address),
    };

    res.send(JSON.stringify(retObj));
  });

  api.setGet('/electrum/keys/validateaddress', (req, res, next) => {
    const retObj = {
      msg: 'success',
      result: addressVersionCheck(networks[req.query.network.toLowerCase()] || networks.kmd, req.query.address),
    };

    res.send(JSON.stringify(retObj));
  });

  api.getSpvFees = () => {
    let _fees = {};

    for (let key in api.electrumServers) {
      if (api.electrumServers[key].txfee) {
        _fees[key.toUpperCase()] = api.electrumServers[key].txfee;
      }
    }

    return _fees;
  };

  return api;
};
