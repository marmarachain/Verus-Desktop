var cp = require('child_process');
const { dialog } = require('electron');
const api = require('../../../../api');
const {
  closeBootstrapWindow,
  setBootstrapWindowOnClose,
  getBootstrapBrowserWindow,
} = require("../../window");

function setup(print) {
  const BootstrapWindow = getBootstrapBrowserWindow()

  return new Promise((resolve, reject) => {
    dialog.showMessageBox(BootstrapWindow, {
      type: "question",
      title: "Bootstrap VRSC?",
      message: "Would you like to speed up syncing to the Verus blockchain by downloading blockchain data from the internet?\n\n" +
          "This will run a script to download blockchain information from veruscoin.io.\n\nBefore accepting, "  +
          "make sure that any running instances of Verus in native mode are shut down.\n\nWhile the script is running, please do not " +
          "close the script window, or start Verus in native mode. When it is finished, it will close itself.",
      buttons: ["Yes", "No"]
    }, (init) => {
      if (init === 0) {
        const child = cp.spawn(api.paths[`vrsc-fetch-bootstrap`], [], {});
        let askedOverwrite = false;
        let checkedDataDir = false;
        let confirmedDataDir = false;
        let out = [];
        let canceled = false;

        setBootstrapWindowOnClose((e) => {
          child.kill("SIGTERM");
        });

        child.stdout.on("data", (data) => {
          out = out.concat(data.toString().split("\n"));

          if (
              !checkedDataDir &&
              out.some((x) =>
                  x.includes("Enter blockchain data directory or leave blank for default:")
              )
          ) {
            checkedDataDir = true

            if (
                api.appConfig.coin.native.dataDir['VRSC'] &&
                api.appConfig.coin.native.dataDir['VRSC'].length > 0
            ) {
              child.stdin.write(api.appConfig.coin.native.dataDir['VRSC'] + "\n");
            } else {
              child.stdin.write("\n");
            }
          } else if  (
              !confirmedDataDir &&
              out.some((x) =>
                  x.includes("Install bootstrap in ")
              )
          ) {
            confirmedDataDir = true
            child.stdin.write("1" + "\n");
          } else if (
              !askedOverwrite &&
              out.some((x) =>
                  x.includes("Existing blockchain data found. Overwrite?")
              )
          ) {
            askedOverwrite = true;
            dialog.showMessageBox(BootstrapWindow, {
              type: "question",
              title: "Overwrite old blockchain data?",
              message:
                "VRSC blockchain data detected on device, would you like to overwrite the following data?\n\n" +
                out
                  .filter((x) => (x.includes("/") || x.includes("\\")) &&
                      (!x.includes("Install bootstrap in") && !x.includes("Existing blockchain data found. Overwrite?")) )
                  .join("\n\n"),
              buttons: ["Yes", "No"],
            }, (answer) => {
              if (answer === 0) {
                child.stdin.write("1" + "\n");
              } else {
                canceled = true;
                child.stdin.write("2" + "\n");
              }
            });
          } else print(data);
        });

        child.stderr.on("data", (data) => {
          if (!data.includes("?")) {
            print(data);
          }
        });

        child.on("close", (code) => {
          if (!canceled && code === 0) {
            dialog.showMessageBox(BootstrapWindow, {
              type: "info",
              title: "Success!",
              message: "Finished running Verus bootstrap setup, you may now start Verus in native mode.",
              buttons: ["OK"],
            }, () => {
              closeBootstrapWindow();
              resolve();
            });
          } else if (code !== 0) {
            dialog.showMessageBox(BootstrapWindow, {
              type: "error",
              title: "Error.",
              message: "Verus bootstrap setup not completed.",
              buttons: ["OK"],
            }, () => {
              closeBootstrapWindow();
              resolve();
            });
          }
        });
      } else {
        closeBootstrapWindow();
        resolve()
      }
    })
  })
}

module.exports = {
  setup
}