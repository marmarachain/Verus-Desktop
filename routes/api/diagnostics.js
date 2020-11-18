const { dialog } = require('electron');
const fs = require('fs-extra');
const si = require('systeminformation')
const path = require('path');

module.exports = (api) => {
  api.generateDiagnosticPacket = (mainWindow) => {
    return new Promise((resolve, reject) => {
      dialog.showMessageBox(
        mainWindow,
        {
          title: "Generate diagnostic packet?",
          message: 'Would you like to generate a packet of extracted diagnostic info from Verus-Desktop? This WILL contain ' + 
          'information about your computer, operating system, and the processes that Verus Desktop has been running during this session. It ' +
          'WILL NOT contain any private keys, seed phrases, or secret information. Regardless, ONLY SHARE IT WITH THOSE YOU TRUST.',
          buttons: ["Yes", "No"],
        },
        (init) => {
          if (init === 0) {
            dialog.showOpenDialog(mainWindow, {
              title: "Select directory",
              message: "Choose where to save your diagnostic packet.",
              properties: ['openDirectory', 'createDirectory']
            }, async (filePaths) => {
                if (filePaths.length === 0) resolve() 
                else {
                  const mainPath = filePaths[0]
                  const diagnosticFiles = [
                    {
                      name: 'system.json',
                      data: {...await si.getStaticData(), time: si.time()}
                    },
                    {
                      name: 'logs.json',
                      data: await api.getAppRuntimeLog()
                    },
                    {
                      name: 'config.json',
                      data: api.appConfig
                    },
                    {
                      name: 'app_info.json',
                      data: api.appBasicInfo
                    }
                  ]
  
                  try {
                    const diagPath = path.join(mainPath, 'vd_diagnostics_' + si.time().current)
                    fs.mkdirSync(diagPath);
  
                    for (const toSave of diagnosticFiles) {
                      await fs.writeFile(path.join(diagPath, toSave.name), JSON.stringify(toSave.data, null, 2))
                    }

                    for (const pathName in api.paths) {
                      if (pathName.slice(pathName.length - 7) === "DataDir") {
                        const debugLogPath = path.join(api.paths[pathName], 'debug.log')
                        const coinFolder = path.join(diagPath, pathName)

                        try {
                          fs.mkdirSync(coinFolder);

                          await fs.copyFile(debugLogPath, path.join(coinFolder, 'debug.log'))
                        } catch(e) {
                          fs.rmdirSync(coinFolder);
                          api.log('Could not copy debug file from ' + pathName, 'diagnostics')
                          api.log(e, 'diagnostics')
                        }
                      }
                    }
  
                    dialog.showMessageBox(mainWindow, {
                      title: "Success!",
                      message: "Diagnostic packet saved to " + diagPath,
                      buttons: ["OK"],
                    })
                    resolve()
                  } catch(e) {
                    dialog.showOpenDialog(mainWindow, {
                      title: "Error",
                      message: "Error saving file."
                    })
                    resolve()
                  }
                }
            })
          } else resolve()
        }
      );
    })
  }

  return api;
};