'use strict';

var Q = require('q');
var fs = require('fs');
var wrench = require('wrench');
var childProcess = require('child_process');

var filenameWindows;
var filenameMacos;

//-----------------------------------------------
// Helper functions
//-----------------------------------------------

function copyFile(from, to) {
    var data = fs.readFileSync(from);
    fs.writeFileSync(to, data, {
        encoding: 'binary',
        flags: 'w'
    });
}

function overwriteJsonProperties(path, properties) {
    
    function passProperties(to, from) {
        for (var field in from) {
            if (typeof from[field] === 'object') {
                passProperties(to[field], from[field]);
            } else {
                to[field] = from[field];
            }
        }
    }
    
    var json = JSON.parse(fs.readFileSync(path));
    passProperties(json, properties);
    fs.writeFileSync(path, JSON.stringify(json, null, 4));
}


//-----------------------------------------------
// 
//-----------------------------------------------

var version = JSON.parse(fs.readFileSync('app/package.json')).version;

// folder where built files will end up
var workingPath = '../release';

// if working path folder exists clear it
if (fs.existsSync(workingPath)) {
    wrench.rmdirSyncRecursive(workingPath);
}
fs.mkdirSync(workingPath);


//-----------------------------------------------
// App
//-----------------------------------------------

function zip(sourceFile, destFile) {
    var deferred = Q.defer();
    
    process.stdout.write('Packing to ' + destFile);
    
    childProcess.execFile(__dirname + "/7zip/7za.exe",
        ["a", destFile, sourceFile ],
        { cwd: workingPath },
    function (error, stdout, stderr) {
        if (error) {
            console.log(error);
        } else {
            console.log(' - DONE');
            deferred.resolve();
        }
    });
    
    return deferred.promise;
}

function build(platform) {
    var deployPath;
    var runtimeSource;
    var runtimeDestination;
    var appSource = './app';
    var appDestination;
    var folderName;
    var zipName = 'sputnik-' + version + '-' + platform + '.zip';
    var deferred = Q.defer();
    
    process.stdout.write('Building app for: ' + platform);
    
    
    switch (platform) {
    case 'windows':
        deployPath = workingPath + '/Sputnik';
        runtimeSource = './nw/windows';
        runtimeDestination = deployPath + '/app';
        appDestination = runtimeDestination;
        
        fs.mkdirSync(deployPath);
        
        wrench.copyDirSyncRecursive(appSource, appDestination, {
            filter: /^spec$/, //exclude spec folder
        });
        
        copyFile(runtimeSource + '/nw.exe', runtimeDestination + '/sputnik.exe');
        copyFile(runtimeSource + '/nw.pak', runtimeDestination + '/nw.pak');
        copyFile(runtimeSource + '/icudt.dll', runtimeDestination + '/icudt.dll');
        
        copyFile('src/release/windows/sputnik.exe', deployPath + '/sputnik.exe');
        
        folderName = 'Sputnik';
        filenameWindows = zipName;
        
        break;
    
    case 'macos':
        deployPath = workingPath + '/Sputnik.app';
        runtimeSource = './nw/macos/node-webkit.app';
        runtimeDestination = deployPath;
        appDestination = deployPath + '/Contents/Resources/app.nw';
        
        wrench.copyDirSyncRecursive(runtimeSource, runtimeDestination);
        wrench.copyDirSyncRecursive(appSource, appDestination, {
            filter: /^spec$/, //exclude spec folder
        });
        
        var infoFile = fs.readFileSync('src/release/macos/Info.plist', 'utf8');
        infoFile = infoFile.replace('{{sputnikVersion}}', version);
        fs.writeFileSync(runtimeDestination + '/Contents/Info.plist', infoFile, 'utf8');
        
        copyFile('src/release/macos/icon.icns', runtimeDestination + '/Contents/Resources/icon.icns');
        
        // delete nw icon
        fs.unlinkSync(runtimeDestination + '/Contents/Resources/nw.icns');
        
        folderName = 'Sputnik.app';
        filenameMacos = zipName;
        
        break;
    }
    
    
    overwriteJsonProperties(appDestination + '/package.json', {
        name: 'Sputnik',
        window: {
            toolbar: false
        }
    });

    overwriteJsonProperties(appDestination + '/appConfig.json', {
        targetPlatform: platform,
        websiteUrl: 'http://sputnik.szwacz.com',
        websiteUrlUpdate: 'http://sputnik.szwacz.com/update',
        analyticsUrl: 'http://sputnik.szwacz.com/analytics/hit.php',
        checkUpdatesUrl: 'http://sputnik.szwacz.com/check-updates/updates.json'
    });
    
    console.log(' - DONE');
    
    zip(folderName, zipName)
    .then(function (filename) {
        wrench.rmdirSyncRecursive(deployPath);
        deferred.resolve(filename);
    });
    
    return deferred.promise;
}


//-----------------------------------------------
// Website
//-----------------------------------------------

function buildWebsite() {
    var deferred = Q.defer();
    
    process.stdout.write('Building website');
    
    overwriteJsonProperties(__dirname + '/../../website/config.json', {
        locals: {
            windowsDownload: '/downloads/' + filenameWindows,
            macosDownload: '/downloads/' + filenameMacos
        }
    });
    
    childProcess.exec("wintersmith build",
        { cwd: __dirname + '/../../website' },
    function (error, stdout, stderr) {
        if (error) {
            console.log(error);
        } else {
            
            // make file for autoupdates
            var updates = JSON.stringify({
                version: version
            }, null, 4);
            fs.mkdirSync(workingPath + '/website/check-updates');
            fs.writeFileSync(workingPath + '/website/check-updates/updates.json', updates);
            
            // copy packaged apps to website structure
            var downloadsPath = workingPath + '/website/downloads';
            fs.mkdirSync(downloadsPath);
            copyFile(workingPath + '/' + filenameWindows, downloadsPath + '/' + filenameWindows);
            copyFile(workingPath + '/' + filenameMacos, downloadsPath + '/' + filenameMacos);
            
            console.log(' - DONE');
            
            deferred.resolve();
        }
    });
    
    return deferred.promise;
}

//-----------------------------------------------
// Building...
//-----------------------------------------------

build('windows')
.then(function () {
    return build('macos');
})
.then(buildWebsite)
.then(function () {
    console.log('SUCCESS!');
})
.catch(function (error) {
    console.log(error);
});