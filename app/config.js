'use strict';

function initSputnikConfig() {
    
    var fs = require('fs');
    var gui = require('nw.gui');
    
    var appConf = JSON.parse(fs.readFileSync('./appConfig.json'));
    
    var dataHomeFolder = appConf.dataHomeFolder;
    if (appConf.targetPlatform === 'macos') {
        dataHomeFolder = gui.App.dataPath[0];
    } else {
        dataHomeFolder = '../data';
    }
    
    var userConf = {};
    var userConfPath = dataHomeFolder + '/config.json';
    if (fs.existsSync(userConfPath)) {
        userConf = JSON.parse(fs.readFileSync(userConfPath));
    }
    
    function generateGuid() {
        var crypto = require('crypto');
        var rand = crypto.randomBytes(8).toString('hex');
        var now = Date.now().toString();
        return crypto.createHash('md5').update(rand + now).digest('hex');
    }
    
    function setUserConfProperty(key, value) {
        userConf[key] = value;
        fs.writeFile(userConfPath, JSON.stringify(userConf, null, 4), { encoding: 'utf8' });
    }
    
    if (!userConf.guid && localStorage.guid) {
        // legacy from v0.9.0
        // guid was stored in localStorage
        setUserConfProperty('guid', localStorage.guid);
    }
    if (!userConf.guid) {
        setUserConfProperty('guid', generateGuid());
    }
    
    return  {
        get version() {
            return gui.App.manifest.version;
        },
        get dataHomeFolder() {
            return dataHomeFolder;
        },
        
        get targetPlatform() {
            return appConf.targetPlatform;
        },
        get websiteUrl() {
            return appConf.websiteUrl;
        },
        get websiteUrlUpdate() {
            return appConf.websiteUrlUpdate;
        },
        get analyticsUrl() {
            return appConf.analyticsUrl;
        },
        get checkUpdatesUrl() {
            return appConf.checkUpdatesUrl;
        },
        
        get guid() {
            return userConf.guid;
        },
        get lastFeedsDownload() {
            return userConf.lastFeedsDownload;
        },
        set lastFeedsDownload(value) {
            setUserConfProperty('lastFeedsDownload', value);
        },
    };
}