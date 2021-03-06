/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

var path = require('path');
var optimist = require('optimist');
var shelljs = require('shelljs');
var flagutil = require('./flagutil');

module.exports = function*(argv) {
    var opt = flagutil.registerHelpFlag(optimist);
    argv = opt
        .usage('Does an npm-link of the modules that we publish. Ensures we are testing live versions of our own dependencies instead of the last published version.\n' +
               '\n' +
               'Usage: $0 npm-link')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    function getPathFromModuleName(moduleName) {
        if (moduleName == "cordova-lib") {
            return(moduleName + path.sep + moduleName);
        } else {
            return(moduleName);
        }
    }

    function cdInto(moduleName) {
        var myPath = getPathFromModuleName(moduleName);
        shelljs.pushd(myPath);
    }

    function cdOutOf() {
        shelljs.popd();
    }

    function npmLinkIn(linkedModule, installingModule) {
       cdInto(installingModule);
       // 'npm link' will automatically unbuild a non-linked module if it is present,
       // so don't need to explicitly 'rm -r' it first.
       shelljs.exec("npm link " + linkedModule);
       cdOutOf();
    }

    function npmLinkOut(moduleName) {
        cdInto(moduleName);
        shelljs.exec("npm link");
        cdOutOf();
    }

    console.log("npm-linking dependent modules");

    npmLinkOut("cordova-js");
    npmLinkIn("cordova-js", "cordova-lib");

    npmLinkOut("cordova-lib");
    npmLinkIn("cordova-lib", "cordova-plugman");
    npmLinkIn("cordova-lib", "cordova-cli");

};

