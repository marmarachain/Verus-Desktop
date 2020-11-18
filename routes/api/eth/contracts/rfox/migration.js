const ethers = require('ethers');
const RFOX_UTILITY_ABI = require('./abi');
const RFOX_UTILITY_CONTRACT = "0xD82F7e3956d3FF391C927Cd7d0A7A57C360DF5b9"

module.exports = (api) => {  
  api.eth.rfox = {}

  api.setGet('/eth/rfox/estimate_gas_claim_account_balances', async (req, res, next) => {
    try {
      res.send(JSON.stringify({
        msg: 'success',
        result: await api.eth.rfox.estimateGasClaimAccountBalances()
      })); 
    } catch (e) {
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      })); 
    }
  });

  api.setGet('/eth/rfox/get_account_balances', async (req, res, next) => {
    try {
      res.send(JSON.stringify({
        msg: 'success',
        result: await api.eth.rfox.getAccountBalances()
      })); 
    } catch (e) {
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      })); 
    }
  });

  api.setPost('/eth/rfox/claim_account_balances', async (req, res, next) => {
    try {
      res.send(JSON.stringify({
        msg: 'success',
        result: await api.eth.rfox.claimAccountBalances()
      })); 
    } catch (e) {
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      })); 
    }
  });

  /**
   * Estimates the gas required to claim the account balance of an RFOX account
   */
  api.eth.rfox.estimateGasClaimAccountBalances = async () => {
    const coin = 'RFOX'

    if (api.eth.connect[coin]) {
      const contract = new ethers.Contract(
        RFOX_UTILITY_CONTRACT, 
        RFOX_UTILITY_ABI, 
        api.eth.connect[coin]);
      
      const uncompressedPubKey = api.eth.connect[coin].signingKey.publicKey
    
      const x = Buffer.from(uncompressedPubKey.slice(4, 68), 'hex')
      const y = Buffer.from(uncompressedPubKey.slice(68), 'hex')
    
      return (
        await contract.estimate.withdrawBalance(x, y)
      ).mul(await api.eth.connect[coin].provider.getGasPrice());
    } else {
      throw new Error("Could not connect to uninitialized coin RFOX.")
    }
  }

  /**
   * Claims claimable account balance of a RedFOX account
   */
  api.eth.rfox.claimAccountBalances = async () => {
    const coin = 'RFOX'

    if (api.eth.connect[coin]) {
      const contract = new ethers.Contract(
        RFOX_UTILITY_CONTRACT, 
        RFOX_UTILITY_ABI, 
        api.eth.connect[coin]);
      
      const uncompressedPubKey = api.eth.connect[coin].signingKey.publicKey
    
      const x = Buffer.from(uncompressedPubKey.slice(4, 68), 'hex')
      const y = Buffer.from(uncompressedPubKey.slice(68), 'hex')
    
      return await contract.withdrawBalance(x, y)
    } else {
      throw new Error("Could not connect to uninitialized coin RFOX.")
    }
  }

  /**
   * Gets total account balance of a RedFOX account
   */
  api.eth.rfox.getAccountBalances = async () => {
    const coin = 'RFOX'

    if (api.eth.connect[coin]) {
      const contract = new ethers.Contract(
        RFOX_UTILITY_CONTRACT, 
        RFOX_UTILITY_ABI, 
        api.eth.connect[coin]);
      
      const uncompressedPubKey = api.eth.connect[coin].signingKey.publicKey
  
      const x = Buffer.from(uncompressedPubKey.slice(4, 68), 'hex')
      const y = Buffer.from(uncompressedPubKey.slice(68), 'hex')
  
      return await contract.totalAccountBalance(x, y)
    } else {
      throw new Error("Could not connect to uninitialized coin RFOX.")
    }
  }

  return api;
};