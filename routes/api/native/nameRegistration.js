const Promise = require('bluebird');

module.exports = (api) => {    
  api.native.register_id_name = (coin, name, referralId) => {
    return new Promise((resolve, reject) => {      
      let params = referralId ? [name, null, referralId] : [name, null]
      let controlAddress

      api.native.callDaemon(coin, 'getnewaddress', [])
      .then(newAddress => {
        params[1] = newAddress
        controlAddress = newAddress

        return api.native.callDaemon(coin, 'registernamecommitment', params)
      })
      .then(async (nameCommitmentResult) => {
        if (
          nameCommitmentResult &&
          nameCommitmentResult.txid &&
          nameCommitmentResult.namereservation
        ) {
          let localCommitments = await api.loadLocalCommitments()
          let saveCommitment = { ...nameCommitmentResult, controlAddress }

          if (localCommitments[coin]) {
            const existingIndex = localCommitments[coin].findIndex((value) => value.namereservation.name === name)
            
            if (existingIndex !== -1) {
              localCommitments[coin][existingIndex] = saveCommitment
            } else {
              localCommitments[coin] = [...localCommitments[coin], saveCommitment]
            }
          } else {
            localCommitments[coin] = [saveCommitment]
          }

          await api.saveLocalCommitments(localCommitments);

          resolve({...saveCommitment, coin});
        } else {
          throw new Error(nameCommitmentResult)
        }
      })
      .catch(err => {
        reject(err)
      })
    });
  };

  api.native.register_id_name_preflight = (coin, name, referralId) => {
    return new Promise((resolve, reject) => {      
      resolve({ namereservation: { coin, name, referral: referralId } });
    });
  };

  api.setPost('/native/register_id_name', (req, res, next) => {
    const { chainTicker, name, referralId } = req.body

    api.native.register_id_name(chainTicker, name, referralId)
    .then((nameCommitmentResult) => {
      const retObj = {
        msg: 'success',
        result: nameCommitmentResult,
      };
  
      res.send(JSON.stringify(retObj));  
    })
    .catch(error => {
      const retObj = {
        msg: 'error',
        result: error.message,
      };
  
      res.send(JSON.stringify(retObj));  
    })
  });

  api.setPost('/native/register_id_name_preflight', (req, res, next) => {
    const { chainTicker, name, referralId } = req.body

    api.native.register_id_name_preflight(chainTicker, name, referralId)
    .then((preflightRes) => {
      const retObj = {
        msg: 'success',
        result: preflightRes,
      };
  
      res.send(JSON.stringify(retObj));  
    })
    .catch(error => {
      const retObj = {
        msg: 'error',
        result: error.message,
      };
  
      res.send(JSON.stringify(retObj));  
    })
  });

  api.native.get_name_commitments = async (coin) => {
    try {
      const nameCommits = await api.loadLocalCommitments()

      if (nameCommits[coin] == undefined) {
        await api.saveLocalCommitments({
          ...nameCommits,
          [coin]: []
        });

        return []
      } else {
        return nameCommits[coin]
      }
    } catch (e) {
      throw (e)
    }
  };

  api.setPost('/native/get_name_commitments', async (req, res, next) => {
    const { chainTicker } = req.body
    const coin = chainTicker

    try {
      const retObj = {
        msg: 'success',
        result: await api.native.get_name_commitments(coin),
      };

      res.send(JSON.stringify(retObj));
    } catch (e) {
      const retObj = {
        msg: 'error',
        result: e.message,
      };

      res.send(JSON.stringify(retObj));
    }
  });

  api.native.delete_name_commitment = async (name, coin) => {
    try {
      let nameCommits = await api.loadLocalCommitments()
      
      if (nameCommits[coin] == undefined) {
        await api.saveLocalCommitments({
          ...nameCommits,
          [coin]: []
        });

        return false
      } else {
        newNameCommits = {
          ...nameCommits,
          [coin]: nameCommits[coin].filter(nameCommit => {

            return nameCommit.namereservation.name !== name
          })
        }
        
        await api.saveLocalCommitments(newNameCommits);
        return true
      }
    } catch (e) {
      throw (e)
    }
  }

  api.setPost('/native/delete_name_commitment', async (req, res, next) => {
    const { chainTicker, name } = req.body

    try {
      const retObj = {
        msg: 'success',
        result: await api.native.delete_name_commitment(name, chainTicker),
      };

      res.send(JSON.stringify(retObj));
    } catch (e) {
      const retObj = {
        msg: 'error',
        result: e.message,
      };

      res.send(JSON.stringify(retObj));
    }
  });

  return api;
};