const fs = require('fs-extra');

module.exports = (api) => {
  /*
   *  type: POST
   *  params: none
   */
  api.setPost('/addressbook', async (req, res, next) => {
    const data = req.body.data;

    fs.writeFile(`${api.paths.agamaDir}/shepherd/addressBook.json`, JSON.stringify(data), (err) => {
      if (err) {
        api.log('error writing address book file', 'addressBook');

        const retObj = {
          msg: 'error',
          result: 'error writing address book file',
        };

        res.send(JSON.stringify(retObj));
      } else {
        const retObj = {
          msg: 'success',
          result: 'address book is updated',
        };

        res.send(JSON.stringify(retObj));
      }
    });
  });

  return api;
};