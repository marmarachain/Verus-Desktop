const fs = require('fs-extra');
const os = require('os');
const { formatBytes } = require('agama-wallet-lib/src/utils');

module.exports = (api) => {
  api.SystemInfo = () => {
    const os_data = {
      totalmem_bytes: os.totalmem(),
      totalmem_readable: formatBytes(os.totalmem()),
      arch: os.arch(),
      cpu: os.cpus()[0].model,
      cpu_cores: os.cpus().length,
      platform: os.platform(),
      os_release: os.release(),
      os_type: os.type(),
    };

    return os_data;
  }

  api.appInfo = () => {
    const sysInfo = api.SystemInfo();
    const releaseInfo = api.appBasicInfo;
    const dirs = {
      agamaDir: api.paths.agamaDir,
      kmdDataDir: api.paths.kmdDataDir,
      komododBin: api.komododBin,
      configLocation: `${api.paths.agamaDir}/config.json`,
      cacheLocation: `${api.paths.agamaDir}/spv-cache.json`,
    };
    let spvCacheSize = '2 Bytes';

    try {
      spvCacheSize = formatBytes(fs.lstatSync(`${api.paths.agamaDir}/spv-cache.json`).size);
    } catch (e) {}

    return {
      sysInfo,
      releaseInfo,
      dirs,
      cacheSize: spvCacheSize,
    };
  }

  return api;
};