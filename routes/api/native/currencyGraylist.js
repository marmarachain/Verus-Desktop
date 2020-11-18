module.exports = (api) => {    
  // api.setGet('/native/get_currency_graylist', (req, res, next) => {
  //   const { token } = req.body
   
  //   if (api.checkToken(token)) {
  //     api.native.loadCurrencyGraylist()
  //     .then((graylist) => {
  //       const retObj = {
  //         msg: 'success',
  //         result: graylist,
  //       };
    
  //       res.send(JSON.stringify(retObj));  
  //     })
  //     .catch(error => {
  //       const retObj = {
  //         msg: 'error',
  //         result: error.message,
  //       };
    
  //       res.send(JSON.stringify(retObj));  
  //     })
  //   } else {
  //     const retObj = {
  //       msg: 'error',
  //       result: 'unauthorized access',
  //     };

  //     res.send(JSON.stringify(retObj));
  //   }
  // });
 
  return api;
};