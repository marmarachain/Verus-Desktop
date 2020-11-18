const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const os = require('os');
let agamaIcon;
let fetchWindow = null
const path = require('path');

if (os.platform() === 'linux') {
	agamaIcon = path.join(__dirname, '/assets/icons/vrsc_512x512x32.png');
}
if (os.platform() === 'win32') {
	agamaIcon = path.join(__dirname, '/assets/icons/vrsc.ico');
}

function createFetchBoostrapWindow(chainTicker, appConfig) {
	if (fetchWindow == null) {
		fetchWindow = new BrowserWindow({ 
			width: 750,
			height: 500,
			frame: true,
			icon: agamaIcon,
			backgroundColor: "#3165D4",
			show: false,
			title: `Fetch ${chainTicker} Bootstrap`,
			contextIsolation: true
		});
		fetchWindow.show();
	
		fetchWindow.loadURL(
			appConfig.general.main.dev || process.argv.indexOf("devmode") > -1
				? `http://${appConfig.general.main.host}:${appConfig.general.main.agamaPort}/gui/fetch-bootstrap/fetch-bootstrap.html?ticker=${chainTicker}`
				: `file://${__dirname}/../../../gui/fetch-bootstrap/fetch-bootstrap.html?ticker=${chainTicker}`
		);

		return new Promise((resolve, reject) => {
			fetchWindow.on('closed', () => resolve())
		})
	}
}

function closeBootstrapWindow() {
	if (fetchWindow != null) {
		setTimeout(() => {
			fetchWindow.close()
			fetchWindow = null
		}, 500)
	}
}

function getBootstrapBrowserWindow() {
	return fetchWindow
}

function setBootstrapWindowOnClose(onClose) {
	if (fetchWindow != null) {
		fetchWindow.on('close', () => {
			onClose()
			fetchWindow = null
		})
	}
}

module.exports = {
	createFetchBoostrapWindow,
	closeBootstrapWindow,
	setBootstrapWindowOnClose,
	getBootstrapBrowserWindow
}