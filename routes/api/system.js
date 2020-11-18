const si = require('systeminformation')

module.exports = (api) => {
  /*
   *  type: GET
   */
  api.setGet('/get_static_system_data', (req, res, next) => {
    si.getStaticData()
    .then(data => {
      res.send(JSON.stringify({
        msg: 'success',
        result: data
      }));
    })
    .catch(e => {
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      }));
    })
  });

  /*
   *  type: GET
   */
  api.setGet('/get_cpu_temp', (req, res, next) => {
    const CPU_TEMP_UNSUPPORTED = -1

    si.cpuTemperature()
    .then(data => {      
      if (data.main && data.main === CPU_TEMP_UNSUPPORTED) throw new Error('unsupported_operation')

      res.send(JSON.stringify({
        msg: 'success',
        result: data
      }));
    })
    .catch(e => {
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      }));
    })
  });

  /*
   *  type: GET
   */
  api.setGet('/get_cpu_load', (req, res, next) => {
    si.currentLoad()
    .then(data => {
      res.send(JSON.stringify({
        msg: 'success',
        result: data
      }));
    })
    .catch(e => {
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      }));
    })
  });

  /*
   *  type: GET
   */
  api.setGet('/get_sys_time', (req, res, next) => {
    try {
      res.send(JSON.stringify({
        msg: 'success',
        result: si.time()
      }));
    } catch (e) {      
      res.send(JSON.stringify({
        msg: 'error',
        result: e.message
      }));
    }
  });

  return api;
};