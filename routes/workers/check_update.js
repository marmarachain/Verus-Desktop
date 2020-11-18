const version_json = require('../../version.json')
const request = require('request');
const versionCompare = require('../api/utils/version/versionCompare');
 
function updateAvailable() {
  return new Promise((resolve, reject) => {
    request({
      url: version_json.versionUrl,
      method: "GET"
    }, (error, response, body) => {
      if (response &&
          response.statusCode &&
          response.statusCode === 200) {
        try {
          const _parsedBody = JSON.parse(body);

          if (versionCompare.compare(_parsedBody.version, version_json.version, '>')) {
            const mandatory =
              _parsedBody.minVersion != null &&
              versionCompare.compare(
                _parsedBody.minVersion,
                version_json.version,
                ">"
              );

            request({
              url: version_json.repository + `releases/tag/v${_parsedBody.version}`,
              method: "GET"
            }, (_error, _response, _body) => {
              if (_response && _response.statusCode && _response.statusCode === 200) {
                resolve({ update_available: true, version: _parsedBody.version, mandatory })
              } else if (_response.statusCode === 404) {
                resolve({ update_available: false, version: _parsedBody.version, mandatory })
              } else reject(error)
            })
          }
          else resolve({ update_available: false, version: _parsedBody.version, mandatory: false })  
        } catch (e) {
          reject(e)
        }
      } else reject(error)
    });
  })
}

module.exports = updateAvailable