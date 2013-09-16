'use strict';

sputnik.factory('configService', function () {
    var fs = require('fs');
    var gui = require('nw.gui');
    var appConf = JSON.parse(fs.readFileSync('./appConfig.json'));
    
    var dataHomeFolder = appConf.dataHomeFolder;
    if (appConf.targetPlatform === 'macos') {
        dataHomeFolder = gui.App.dataPath[0];
    } else {
        dataHomeFolder = '../data';
    }
    
    var dataPath = dataHomeFolder + '/config.json';
    var config = {};
    
    // in this directory all data are stored
    if (!fs.existsSync(dataHomeFolder)) {
        fs.mkdirSync(dataHomeFolder);
    }
    
    function generateGuid() {
        var crypto = require('crypto');
        var rand = crypto.randomBytes(8).toString('hex');
        var now = Date.now().toString();
        return crypto.createHash('md5').update(rand + now).digest('hex');
    }
    
    function save() {
        fs.writeFileSync(dataPath, JSON.stringify(config, null, 4));
    }
    
    if (fs.existsSync(dataPath)) {
        config = JSON.parse(fs.readFileSync(dataPath));
    }
    
    if (!config.guid) {
        config.guid = generateGuid();
        save();
    }
    if (!config.schedules) {
        config.schedules = {};
    }
    
    return  {
        
        get version() {
            return gui.App.manifest.version;
        },
        get targetPlatform() {
            return appConf.targetPlatform;
        },
        get dataHomeFolder() {
            return dataHomeFolder;
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
            return config.guid;
        },
        
        get windowState() {
            return config.windowState;
        },
        set windowState(value) {
            config.windowState = value;
            save();
        },
        
        get newAppVersion() {
            return config.newAppVersion;
        },
        set newAppVersion(value) {
            config.newAppVersion = value;
            save();
        },
        
        getSchedule: function (key) {
            return config.schedules[key];
        },
        setSchedule: function (key, value) {
            config.schedules[key] = value;
            save();
        }
    };
});