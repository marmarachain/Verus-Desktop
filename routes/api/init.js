const fs = require('fs-extra');
const path = require('path');
let _foldersInitRan = false;

module.exports = (api) => {
  // Moves existing data to new directory
  api.updateDataFolderFormatv071 = () => {
    const oldDirs = [
      `shepherd`,
      `config.json`,
      `users.json`
    ];

    oldDirs.forEach((dir) => {
      if (fs.existsSync(`${api.paths.VerusDesktopDir}/${dir}`)) {
        try {
          fs.copySync(`${api.paths.VerusDesktopDir}/${dir}`, `${api.paths.agamaDir}/${dir}`)

          api.log(`copied ${api.paths.VerusDesktopDir}/${dir} to ${api.paths.agamaDir}/${dir}`, 'init');
          api.writeLog(`copied ${api.paths.VerusDesktopDir}/${dir} to ${api.paths.agamaDir}/${dir}`);
        } catch(e) {
          api.log(`error copying ${api.paths.VerusDesktopDir}/${dir} to ${api.paths.agamaDir}/${dir}`, 'init');
          api.writeLog(`error copying ${api.paths.VerusDesktopDir}/${dir} to ${api.paths.agamaDir}/${dir}`);
        }
      }
    })
  }

  api.isOldDataFolderFormat = () => {    
    return (
      fs.existsSync(api.paths.VerusDesktopDir) &&
      !fs.existsSync(api.paths.agamaDir)
    ) 
  }

  api.createAgamaDirs = () => {
    if (!_foldersInitRan) {
      const rootLocation = path.join(__dirname, '../../');

      fs.readdir(rootLocation, (err, items) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].substr(0, 3) === 'gen') {
            api.log(`remove ${items[i]}`, 'init');
            fs.unlinkSync(rootLocation + items[i]);
          }
        }
      });

      if (!fs.existsSync(api.paths.VerusDesktopDir)) {
        fs.mkdirSync(api.paths.VerusDesktopDir);

        if (fs.existsSync(api.paths.VerusDesktopDir)) {
          api.log(`created verus desktop main folder at ${api.paths.VerusDesktopDir}`, 'init');
          api.writeLog(`created verus desktop main folder at ${api.paths.VerusDesktopDir}`);
        }
      } else {
        api.log('verus desktop main folder already exists', 'init');
      }

      if (!fs.existsSync(api.paths.agamaDir)) {  
        if (api.isOldDataFolderFormat()) {
          fs.mkdirSync(api.paths.agamaDir);
          api.updateDataFolderFormatv071()
        } else {
          fs.mkdirSync(api.paths.agamaDir);
        }

        if (fs.existsSync(api.paths.agamaDir)) {
          api.log(`created verus desktop appdata folder at ${api.paths.agamaDir}`, 'init');
          api.writeLog(`created verus desktop appdata folder at ${api.paths.agamaDir}`);
        }
      } else {
        api.log('verus desktop appdata folder already exists', 'init');
      }

      if (!fs.existsSync(api.paths.backupDir)) {
        fs.mkdirSync(api.paths.backupDir);

        if (fs.existsSync(api.paths.backupDir)) {
          api.log(`created verus desktop backup folder at ${api.paths.agamaDir}`, 'init');
          api.writeLog(`created verus desktop backup folder at ${api.paths.agamaDir}`);
        }
      } else {
        api.log('verus desktop backup folder already exists', 'init');
      }

      if (!fs.existsSync(`${api.paths.agamaDir}/shepherd`)) {
        fs.mkdirSync(`${api.paths.agamaDir}/shepherd`);

        if (fs.existsSync(`${api.paths.agamaDir}/shepherd`)) {
          api.log(`created shepherd folder at ${api.paths.agamaDir}/shepherd`, 'init');
          api.writeLog(`create shepherd folder at ${api.paths.agamaDir}/shepherd`);
        }
      } else {
        api.log('agama/shepherd folder already exists', 'init');
      }

      const _subFolders = [
        'pin',
        'csv',
        'log',
        'currencies'
      ];

      for (let i = 0; i < _subFolders.length; i++) {
        if (!fs.existsSync(`${api.paths.agamaDir}/shepherd/${_subFolders[i]}`)) {
          fs.mkdirSync(`${api.paths.agamaDir}/shepherd/${_subFolders[i]}`);

          if (fs.existsSync(`${api.paths.agamaDir}/shepherd/${_subFolders[i]}`)) {
            api.log(`created ${_subFolders[i]} folder at ${api.paths.agamaDir}/shepherd/${_subFolders[i]}`, 'init');
            api.writeLog(`create ${_subFolders[i]} folder at ${api.paths.agamaDir}/shepherd/${_subFolders[i]}`);
          }
        } else {
          api.log(`shepherd/${_subFolders[i]} folder already exists`, 'init');
        }
      }

      if (!fs.existsSync(api.paths.zcashParamsDir)) {
        fs.mkdirSync(api.paths.zcashParamsDir);
      } else {
        api.log('zcashparams folder already exists', 'init');
      }

      // api.compareNSPVCoinsFile();

      _foldersInitRan = true;
    }
  }

  api.compareNSPVCoinsFile = () => {
    const rootLocation = path.join(__dirname, '../../');
    const nspvCoinsAgamaDirSize = fs.existsSync(`${api.paths.agamaDir}/coins`) && fs.lstatSync(`${api.paths.agamaDir}/coins`);
    let localNSPVCoinsFile = fs.lstatSync(`${rootLocation}/routes/nspv_coins`);
    
    if (!nspvCoinsAgamaDirSize ||
        (nspvCoinsAgamaDirSize && nspvCoinsAgamaDirSize.size !== localNSPVCoinsFile.size)) {
      api.log('NSPV coins file mismatch, copy over', 'init');
      localNSPVCoinsFile = fs.readFileSync(`${rootLocation}/routes/nspv_coins`, 'utf8');
      fs.writeFileSync(`${api.paths.agamaDir}/coins`, localNSPVCoinsFile, 'utf8');
    } else {
      api.log('NSPV coins file is matching', 'init');
    }

    api.parseNSPVports();
  };

  api.parseNSPVports = () => {
    const nspvCoinsAgamaDirExists = fs.existsSync(`${api.paths.agamaDir}/coins`);
    let nspvPorts = {};
    
    if (nspvCoinsAgamaDirExists) {
      const nspvCoinsContent = fs.readFileSync(`${api.paths.agamaDir}/coins`, 'utf8');

      try {
        const nspvCoinsContentJSON = JSON.parse(nspvCoinsContent);

        for (let item of nspvCoinsContentJSON) {
          nspvPorts[item.coin] = item.rpcport;
        }
        api.log(`NSPV coins file ${nspvCoinsContentJSON.length} supported coins`, 'init');
      } catch (e) {
        api.log('NSPV coins file unable to parse!', 'init');
      }
    } else {
      api.log('NSPV coins file doesn\'t exist!', 'init');
    }

    api.nspvPorts = nspvPorts;
    
    // extend dpow coins list
    const dpowCoins = Object.keys(nspvPorts);
    api.dpowCoins = [...new Set([].concat(...[api.dpowCoins, dpowCoins]))];
  };

  return api;
};