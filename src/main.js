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

var co = require('co');
var fs = require('fs');
var path = require('path');
var superspawn = require('./superspawn');
try {
    var optimist = require('optimist');
    var shjs = require('shelljs');
    var request = require('request');
    var Q = require('q');
} catch (e) {
    console.log('Please run "npm install" from this directory:\n\t' + __dirname);
    process.exit(2);
}

var origWorkingDir = process.cwd();

var COMMON_RAT_EXCLUDES = [
    '*.wav',
    '*.webloc',
    '*jasmine-1.2.0*',
    '*.xcodeproj',
    '.*',
    '*-Info.plist',
    'VERSION',
    'node_modules',
    'thirdparty',
    'package.json',
    ];

var platformRepos = [
    {
        title: 'Android',
        id: 'android',
        repoName: 'cordova-android',
        jiraComponentName: 'Android',
        cordovaJsPaths: ['framework/assets/www/cordova.js'],
        ratExcludes: [
            '*.properties',
            'bin',
            'gen',
            'proguard-project.txt'
        ]
    }, {
        title: 'iOS',
        id: 'ios',
        repoName: 'cordova-ios',
        jiraComponentName: 'iOS',
        cordovaJsPaths: ['CordovaLib/cordova.js'],
        versionFilePaths: [path.join('CordovaLib', 'VERSION')]
    }, {
        title: 'BlackBerry',
        id: 'blackberry',
        repoName: 'cordova-blackberry',
        jiraComponentName: 'BlackBerry',
        cordovaJsSrcName: 'cordova.blackberry10.js',
        cordovaJsPaths: [
            path.join('blackberry10', 'javascript', 'cordova.blackberry10.js')
            ],
        versionFilePaths: [
            path.join('blackberry10', 'VERSION'),
            ]
    }, {
        title: 'Windows',
        id: 'windows',
        repoName: 'cordova-windows',
        jiraComponentName: 'Windows 8',
        cordovaJsSrcName: 'cordova.windows8.js',
        cordovaJsPaths: ['windows8/cordova.js', 'windows8/template/www/cordova.js'],
        versionFilePaths: [path.join('windows8', 'VERSION'), path.join('windows8', 'template', 'VERSION')]
    }, {
        title: 'Windows Phone 7 & 8',
        id: 'wp8',
        repoName: 'cordova-wp8',
        jiraComponentName: 'WP8',
        cordovaJsSrcName: 'cordova.windowsphone.js',
        cordovaJsPaths: ['common/www/cordova.js']
    }, {
        title: 'Firefox OS',
        id: 'firefoxos',
        repoName: 'cordova-firefoxos',
        jiraComponentName: 'FirefoxOS',
        cordovaJsSrcName: 'cordova.firefoxos.js',
        cordovaJsPaths: ['cordova-lib/cordova.js']
    }, {
        title: 'Mac OSX',
        id: 'osx',
        repoName: 'cordova-osx',
        jiraComponentName: 'OSX',
        cordovaJsPaths: ['CordovaFramework/cordova.js'],
        inactive: true
    }, {
        title: 'Ubuntu',
        id: 'ubuntu',
        repoName: 'cordova-ubuntu',
        jiraComponentName: 'Ubuntu',
        cordovaJsPaths: ['www/cordova.js']
    }, {
        title: 'Amazon Fire OS',
        id: 'amazon-fireos',
        repoName: 'cordova-amazon-fireos',
        jiraComponentName: 'Amazon FireOS',
        cordovaJsPaths: ['framework/assets/www/cordova.js'],
        ratExcludes: [
            '*.properties',
            'bin',
            'gen',
            'proguard-project.txt'
        ]
    }, {
        title: 'Bada',
        id: 'bada',
        repoName: 'cordova-bada',
        jiraComponentName: 'Bada',
        inactive: true
    }, {
        title: 'Bada WAC',
        id: 'bada-wac',
        repoName: 'cordova-bada-wac',
        jiraComponentName: 'Bada',
        inactive: true
    }, {
        title: 'WebOS',
        id: 'webos',
        repoName: 'cordova-webos',
        jiraComponentName: 'webOS',
        inactive: true
    }, {
        title: 'QT',
        id: 'qt',
        repoName: 'cordova-qt',
        jiraComponentName: 'Qt',
        inactive: true
    }, {
        title: 'Tizen',
        id: 'tizen',
        repoName: 'cordova-tizen',
        jiraComponentName: 'Tizen',
        inactive: true
    }
];

var nonPlatformRepos = [
    {
        title: 'Docs',
        id: 'docs',
        repoName: 'cordova-docs',
        jiraComponentName: 'Docs'
    }, {
        title: 'MobileSpec',
        id: 'mobile-spec',
        repoName: 'cordova-mobile-spec',
        jiraComponentName: 'mobile-spec',
        ratExcludes: [
          'jasmine.*',
          'html',
          'uubench.js',
        ]
    }, {
        title: 'Cordova JS',
        id: 'js',
        repoName: 'cordova-js',
        jiraComponentName: 'CordovaJS'
    }, {
        title: 'Hello World App',
        id: 'app-hello-world',
        repoName: 'cordova-app-hello-world',
        jiraComponentName: 'App Hello World'
    }
];

var pluginRepos = [
    {
        title: 'Plugin - Battery Status',
        id: 'plugin-battery-status',
        repoName: 'cordova-plugin-battery-status',
        jiraComponentName: 'Plugin Battery Status',
        inactive: true
    }, {
        title: 'Plugin - Camera',
        id: 'plugin-camera',
        repoName: 'cordova-plugin-camera',
        jiraComponentName: 'Plugin Camera',
        inactive: true
    }, {
        title: 'Plugin - Console',
        id: 'plugin-console',
        repoName: 'cordova-plugin-console',
        jiraComponentName: 'Plugin Console',
        inactive: true
    }, {
        title: 'Plugin - Contacts',
        id: 'plugin-contacts',
        repoName: 'cordova-plugin-contacts',
        jiraComponentName: 'Plugin Contacts',
        inactive: true
    }, {
        title: 'Plugin - Device Motion',
        id: 'plugin-device-motion',
        repoName: 'cordova-plugin-device-motion',
        jiraComponentName: 'Plugin Device Motion',
        inactive: true
    }, {
        title: 'Plugin - Device Orientation',
        id: 'plugin-device-orientation',
        repoName: 'cordova-plugin-device-orientation',
        jiraComponentName: 'Plugin Device Orientation',
        inactive: true
    }, {
        title: 'Plugin - Device',
        id: 'plugin-device',
        repoName: 'cordova-plugin-device',
        jiraComponentName: 'Plugin Device',
        inactive: true
    }, {
        title: 'Plugin - Dialogs',
        id: 'plugin-dialogs',
        repoName: 'cordova-plugin-dialogs',
        jiraComponentName: 'Plugin Dialogs',
        inactive: true
    }, {
        title: 'Plugin - File Transfer',
        id: 'plugin-file-transfer',
        repoName: 'cordova-plugin-file-transfer',
        jiraComponentName: 'Plugin File Transfer',
        inactive: true
    }, {
        title: 'Plugin - File',
        id: 'plugin-file',
        repoName: 'cordova-plugin-file',
        jiraComponentName: 'Plugin File',
        inactive: true
    }, {
        title: 'Plugin - Geolocation',
        id: 'plugin-geolocation',
        repoName: 'cordova-plugin-geolocation',
        jiraComponentName: 'Plugin Geolocation',
        inactive: true
    }, {
        title: 'Plugin - Globalization',
        id: 'plugin-globalization',
        repoName: 'cordova-plugin-globalization',
        jiraComponentName: 'Plugin Globalization',
        inactive: true
    }, {
        title: 'Plugin - InAppBrowser',
        id: 'plugin-inappbrowser',
        repoName: 'cordova-plugin-inappbrowser',
        jiraComponentName: 'Plugin InAppBrowser',
        inactive: true
    }, {
        title: 'Plugin - Media',
        id: 'plugin-media',
        repoName: 'cordova-plugin-media',
        jiraComponentName: 'Plugin Media',
        inactive: true
    }, {
        title: 'Plugin - Media Capture',
        id: 'plugin-media-capture',
        repoName: 'cordova-plugin-media-capture',
        jiraComponentName: 'Plugin Media Capture',
        inactive: true
    }, {
        title: 'Plugin - Network Information',
        id: 'plugin-network-information',
        repoName: 'cordova-plugin-network-information',
        jiraComponentName: 'Plugin Network Information',
        inactive: true
    }, {
        title: 'Plugin - Splash Screen',
        id: 'plugin-splashscreen',
        repoName: 'cordova-plugin-splashscreen',
        jiraComponentName: 'Plugin SplashScreen',
        inactive: true
    }, {
        title: 'Plugin - Vibration',
        id: 'plugin-vibration',
        repoName: 'cordova-plugin-vibration',
        jiraComponentName: 'Plugin Vibration',
        inactive: true
    }, {
        title: 'Plugin - Statusbar',
        id: 'plugin-statusbar',
        repoName: 'cordova-plugin-statusbar',
        jiraComponentName: 'Plugin Statusbar',
        inactive: true
    }/*, {
        title: 'Plugins - Other',
        id: 'cordova-plugins',
        repoName: 'cordova-plugins',
        jiraComponentName: 'Plugins',
        inactive: true
    }*/
];

var otherRepos = [
    {
        title: 'Cordova CLI',
        id: 'cli',
        repoName: 'cordova-cli',
        jiraComponentName: 'CLI',
        inactive: true
    }, {
        title: 'Cordova Plugman',
        id: 'plugman',
        repoName: 'cordova-plugman',
        jiraComponentName: 'Plugman',
        inactive: true
    }, {
        title: 'Cordova Medic',
        id: 'medic',
        repoName: 'cordova-medic',
        inactive: true
    }, {
        title: 'Cordova App Harness',
        id: 'app-harness',
        repoName: 'cordova-app-harness',
        inactive: true,
        jiraComponentName: 'AppHarness'
    }, {
        title: 'Cordova Coho',
        id: 'coho',
        repoName: 'cordova-coho',
        jiraComponentName: 'Coho',
        inactive: true
    }, {
        title: 'Cordova Labs',
        id: 'labs',
        repoName: 'cordova-labs',
        inactive: true
    }, {
        title: 'Cordova Registry Website',
        id: 'registry-web',
        repoName: 'cordova-registry-web',
        inactive: true
    }, {
        title: 'Cordova Registry DB',
        id: 'registry',
        repoName: 'cordova-registry',
        inactive: true
    }, {
        title: 'Cordova Labs',
        id: 'labs',
        repoName: 'cordova-labs',
        inactive: true
    }, {
        title: 'Apache dist/release/cordova',
        id: 'dist',
        repoName: 'cordova-dist',
        inactive: true,
        svn: 'https://dist.apache.org/repos/dist/release/cordova'
    }, {
        title: 'Apache dist/dev/cordova',
        id: 'dist/dev',
        repoName: 'cordova-dist-dev',
        inactive: true,
        svn: 'https://dist.apache.org/repos/dist/dev/cordova'
    }, {
        title: 'Cordova Website',
        id: 'website',
        repoName: 'cordova-website',
        inactive: true,
        svn: 'https://svn.apache.org/repos/asf/cordova/site'
    }
];

var allRepos = platformRepos.concat(nonPlatformRepos).concat(pluginRepos).concat(otherRepos);

var repoGroups = {
    'all': allRepos,
    'auto': computeExistingRepos(),
    'platform': platformRepos,
    'plugins': pluginRepos,
    'active-platform': platformRepos.filter(function(r) { return !r.inactive }),
    'release-repos': allRepos.filter(function(r) { return !r.inactive })
};
repoGroups['cadence'] = repoGroups['active-platform'].concat([getRepoById('cli'), getRepoById('js'), getRepoById('mobile-spec'), getRepoById('app-hello-world'), getRepoById('docs')]);

var gitCommitCount = 0;

var JIRA_API_URL = "https://issues.apache.org/jira/rest/api/latest/";
var JIRA_PROJECT_KEY = "CB";

var GITHUB_API_URL = "https://api.github.com/";
var GITHUB_ORGANIZATION = "apache";

function reportGitPushResult(repos, branches) {
    print('');
    if (gitCommitCount) {
        var flagsStr = repos.map(function(r) { return '-r ' + r.id; }).join(' ') + ' ' + branches.map(function(b) { return '-b ' + b; }).join(' ');
        print('All work complete. ' + gitCommitCount + ' commits were made locally.');
        print('To review changes:');
        print('  ' + process.argv[1] + ' repo-status ' + flagsStr + ' | less');
        print('To push changes:');
        print('  ' + process.argv[1] + ' repo-push ' + flagsStr);
        print('To revert all local commits:');
        print('  ' + process.argv[1] + ' repo-reset ' + flagsStr);
    } else {
        print('All work complete. No commits were made.');
    }
}

function print() {
    var newArgs = Array.prototype.slice.call(arguments);
    // Prefix any prints() to distinguish them from command output.
    if (newArgs.length > 1 || newArgs[0]) {
        var curDir = path.relative(origWorkingDir, process.cwd());
        var prefix = curDir ? './' + curDir + '/ =' : './ =';
        var PREFIX_LEN = 30;
        if (prefix.length < PREFIX_LEN) {
            prefix += new Array(PREFIX_LEN - prefix.length + 1).join('=');
        }
        newArgs.unshift(prefix);
        newArgs = newArgs.map(function(val) { return val.replace(/\n/g, '\n' + prefix + ' ') });
    }

    console.log.apply(console, newArgs);
}

function fatal() {
    console.error.apply(console, arguments);
    process.exit(1);
}

function createPlatformDevVersion(version) {
    // e.g. "3.1.0" -> "3.2.0-dev".
    // e.g. "3.1.2-0.8.0-rc2" -> "3.2.0-0.8.0-dev".
    version = version.replace(/-rc.*$/, '');
    var parts = version.split('.');
    parts[1] = String(+parts[1] + 1);
    var cliSafeParts = parts[2].split('-');
    cliSafeParts[0] = '0';
    parts[2] = cliSafeParts.join('-');
    return parts.join('.') + '-dev';
}

function getVersionBranchName(version) {
    if (/-dev$/.test(version)) {
        return 'master';
    }
    return version.replace(/\d+(-?rc\d)?$/, 'x');
}

function validateVersionString(version, opt_allowNonSemver) {
    var pattern = opt_allowNonSemver ? /^\d+\.\d+\.\d+(-?rc\d)?$/ : /^\d+\.\d+\.\d+(-rc\d)?$/;
    if (!pattern.test(version)) {
        fatal('Versions must be in the form #.#.#-[rc#]');
    }
    return version;
}

function registerRepoFlag(opt) {
    return opt.options('r', {
        alias: 'repo',
        desc: 'Which repos to operate on. Multiple flags allowed. This can be repo IDs or repo groups. Use the list-repos command see valid values.',
        default: 'auto'
    });
}

function registerHelpFlag(opt) {
    return opt.options('h', {
        alias: 'help',
        desc: 'Shows help information.'
    });
}

function ARGS(s, var_args) {
    var ret = s.trim().split(/\s+/);
    for (var i = 1; i < arguments.length; ++i) {
        ret.push(arguments[i]);
    }
    return ret;
}

function execHelper(cmdAndArgs, silent, allowError) {
    // there are times where we want silent but not allowError.
    if (null == allowError) {
        // default to allow failure if being silent.
        allowError = allowError || silent;
    }
    if (/^git commit/.exec(cmdAndArgs.join(' '))) {
        gitCommitCount++;
    }
    cmdAndArgs[0] = cmdAndArgs[0].replace(/^git /, 'git -c color.ui=always ');
    if (!silent) {
        print('Executing:', cmdAndArgs.join(' '));
    }
    // silent==2 is used only when modifying ulimit and re-exec'ing,
    // so don't be silent but allow whatever to happen.
    var result = superspawn.spawn(cmdAndArgs[0], cmdAndArgs.slice(1), {stdio: (silent && (silent !== 2)) ? 'default' : 'inherit'});
    return result.then(null, function(e) {
        if (allowError) {
            return null;
        } else if (!(silent === true)) {
            print(e.output);
        }
        process.exit(2);
    });
}

function cpAndLog(src, dest) {
    print('Coping File:', src, '->', dest);
    // Throws upon failure.
    shjs.cp('-f', src, dest);
    if (shjs.error()) {
        fatal('Copy failed.');
    }
}

function *gitCheckout(branchName) {
    var curBranch = yield retrieveCurrentBranchName(true);
    if (curBranch != branchName) {
        return yield execHelper(ARGS('git checkout -q ', branchName));
    }
}

var isInForEachRepoFunction = false;

function *forEachRepo(repos, func) {
    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        var origPath = isInForEachRepoFunction ? process.cwd() : '..';
        var newPath = isInForEachRepoFunction ? path.join('..', repo.repoName) : repo.repoName;

        isInForEachRepoFunction = true;
        shjs.cd(newPath);
        if (shjs.error()) {
            fatal('Repo directory does not exist: ' + repo.repoName + '. First run coho repo-clone.');
        }
        yield func(repo);
        shjs.cd(origPath);

        isInForEachRepoFunction = origPath != '..';
    }
}

function getRepoById(id, opt_repos) {
    // Strip cordova- prefix if it exists.
    id = id.replace(/^cordova-/, '');
    var repos = opt_repos || allRepos;
    for (var i = 0; i < repos.length; ++i) {
        if (repos[i].id == id) {
            return repos[i];
        }
    }
    return null;
}

function createRepoUrl(repo) {
    return 'https://git-wip-us.apache.org/repos/asf/' + repo.repoName + '.git';
}

function *createArchiveCommand(argv) {
    var opt = registerRepoFlag(optimist)
    opt = opt
        .options('tag', {
            desc: 'The pre-existing tag to archive (defaults to newest tag on branch)'
         })
        .options('sign', {
            desc: 'Whether to create .asc, .md5, .sha files (defaults to true)',
            type: 'boolean',
            default: true
         })
        .options('dest', {
            desc: 'The directory to hold the resulting files.',
            demand: true
         });
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Creates a .zip, .asc, .md5, .sha for a repo at a tag.\n' +
               'Refer to https://wiki.apache.org/cordova/SetUpGpg for how to set up gpg\n' +
               '\n' +
               'Usage: $0 create-archive -r plugman -r cli --dest cordova-dist-dev/CB-1111')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);

    if (argv.sign && !shjs.which('gpg')) {
        fatal('gpg command not found on your PATH. Refer to https://wiki.apache.org/cordova/SetUpGpg');
    }

    var outDir = argv.dest;
    shjs.mkdir('-p', outDir);
    var absOutDir = path.resolve(outDir);

    yield forEachRepo(repos, function*(repo) {
        var tag = argv.tag || (yield findMostRecentTag());
        print('Creating archive of ' + repo.repoName + '@' + tag);

        if(repo.id==='plugman'|| repo.id==='cli'){
            var tgzname = yield execHelper(ARGS('npm pack'), true);
            var outPath = path.join(absOutDir, 'cordova-' + tgzname);
            shjs.mv(tgzname, outPath);
        }else{
            var outPath = path.join(absOutDir, repo.repoName + '-' + tag + '.zip');
            yield execHelper(ARGS('git archive --format zip --prefix ' + repo.repoName + '/ -o ', outPath, tag));
        }
        if (argv.sign) {
            yield execHelper(ARGS('gpg --armor --detach-sig --output', outPath + '.asc', outPath));
            fs.writeFileSync(outPath + '.md5', (yield computeHash(outPath, 'MD5')) + '\n');
            fs.writeFileSync(outPath + '.sha', (yield computeHash(outPath, 'SHA512')) + '\n');
        }
    });
    print();
    print('Archives created.');
    print('Verify them using: coho verify-archive ' + path.join(outDir, '*.zip') + ' ' + path.join(outDir, '*.tgz'));
}

function *computeHash(path, algo) {
    print('Computing ' + algo + ' for: ' + path);
    var result = yield execHelper(ARGS('gpg --print-md', algo, path), true);
    return extractHashFromOutput(result);
}

function extractHashFromOutput(output) {
    return output.replace(/.*?:/, '').replace(/\s*/g, '').toLowerCase();
}

function *verifyArchiveCommand(argv) {
    var opt = registerRepoFlag(optimist)
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Ensures the given .zip files match their neighbouring .asc, .md5, .sha files.\n' +
               'Refer to https://wiki.apache.org/cordova/SetUpGpg for how to set up gpg\n' +
               '\n' +
               'Usage: $0 verify-archive a.zip b.zip c.zip')
        .argv;

    var zipPaths = argv._.slice(1);
    if (argv.h || !zipPaths.length) {
        optimist.showHelp();
        process.exit(1);
    }
    if (!shjs.which('gpg')) {
        fatal('gpg command not found on your PATH. Refer to https://wiki.apache.org/cordova/SetUpGpg');
    }

    for (var i = 0; i < zipPaths.length; ++i) {
        var zipPath = zipPaths[i];
        yield execHelper(ARGS('gpg --verify', zipPath + '.asc', zipPath));
        var md5 = yield computeHash(zipPath, 'MD5');
        if (extractHashFromOutput(fs.readFileSync(zipPath + '.md5', 'utf8')) !== md5) {
            fatal('MD5 does not match.');
        }
        var sha = yield computeHash(zipPath, 'SHA512');
        if (extractHashFromOutput(fs.readFileSync(zipPath + '.sha', 'utf8')) !== sha) {
            fatal('SHA512 does not match.');
        }
        print(zipPath + ' signature and hashes verified.');
    }
}

function *printTagsCommand(argv) {
    var opt = registerRepoFlag(optimist)
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Prints out tags & hashes for the given repos. Used in VOTE emails.\n' +
               '\n' +
               'Usage: $0 print-tags -r plugman -r cli')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);

    yield forEachRepo(repos, function*(repo) {
        var tag = yield findMostRecentTag();
        var ref = yield execHelper(ARGS('git show-ref ' + tag), true);
        console.log('    ' + repo.repoName + ': ' + tag.replace(/^r/, '') + ' (' + ref.slice(0, 10) + ')');
    });
}

function computeReposFromFlag(flagValue) {
    var values = Array.isArray(flagValue) ? flagValue : [flagValue];
    var ret = [];
    var addedIds = {};
    function addRepo(repo) {
        if (!addedIds[repo.id]) {
            addedIds[repo.id] = true;
            ret.push(repo);
        }
    }
    values.forEach(function(value) {
        var repo = getRepoById(value);
        var group = repoGroups[value];
        if (repo) {
            addRepo(repo);
        } else if (group) {
            group.forEach(addRepo);
        } else {
            fatal('Invalid repo value: ' + value + '\nUse the list-repos command to see value values.');
        }
    });
    return ret;
}

function *listReleaseUrls(argv) {
    var opt = registerRepoFlag(optimist)
    opt = opt
        .options('version', {
            desc: 'The version of the release. E.g. 2.7.1-rc2',
            demand: true
         })
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('.\n' +
               'Usage: $0 list-release-urls')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);
    var version = argv['version'];

    var baseUrl = 'http://git-wip-us.apache.org/repos/asf?p=%s.git;a=shortlog;h=refs/tags/%s';
    yield forEachRepo(repos, function*(repo) {
        if (!(yield tagExists(version))) {
            console.error('Tag "' + version + '" does not exist in repo ' + repo.repoName);
            return;
        }
        var url = require('util').format(baseUrl, repo.repoName, version);
        console.log(url);
        yield execHelper(ARGS('git show-ref ' + version), 2, true);
    });
}

function computeExistingRepos() {
    return allRepos.filter(function(repo) {
        return shjs.test('-d', repo.repoName);
    });
}

function *localBranchExists(name) {
    return !!(yield execHelper(ARGS('git branch --list ' + name), true));
}

function *remoteBranchExists(repo, name) {
    return !!(yield execHelper(ARGS('git branch -r --list ' + repo.remoteName + '/' + name), true));
}

function *retrieveCurrentBranchName(allowDetached) {
    var ref = yield execHelper(ARGS('git symbolic-ref HEAD'), true, true);
    if (!ref) {
        if (allowDetached) {
            return null;
        }
        throw new Error('Aborted due to repo ' + shjs.pwd() + ' not being on a named branch');
    }
    var match = /refs\/heads\/(.*)/.exec(ref);
    if (!match) {
        throw new Error('Could not parse branch name from: ' + ref);
    }
    return match[1];
}

function findMostRecentTag() {
    return execHelper(ARGS('git describe --tags --abbrev=0 HEAD'), true);
}

function retrieveCurrentTagName() {
    // This will return the tag name plus commit info it not directly at a tag.
    // That's fine since all users of this function are meant to use the result
    // in an equality check.
    return execHelper(ARGS('git describe --tags HEAD'), true, true);
}

function *tagExists(tagName) {
    return !!(yield execHelper(ARGS('git tag --list ' + tagName), true));
}

function *listReposCommand(argv) {
    console.log('Valid values for the --repo flag:');
    console.log('');
    console.log('Repositories:');
    allRepos.forEach(function(repo) {
        console.log('    ' + repo.id);
    });
    console.log('');
    console.log('Repository Groups:');
    var groupNames = Object.keys(repoGroups);
    groupNames.sort();
    groupNames.forEach(function(groupName) {
        console.log('    ' + groupName + ' (' + repoGroups[groupName].map(function(repo) { return repo.id }).join(', ') + ')');
    });
    process.exit(0);
}

function *repoCloneCommand(argv) {
    var opt = registerRepoFlag(optimist)
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Clones git repositories into the current working directory. If the repositories are already cloned, then this is a no-op.\n\n' +
               'Usage: $0 clone --repo=name [--repo=othername]')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);
    yield cloneRepos(repos, false);
}

function *cloneRepos(repos, quiet) {
    var failures = [];
    var numSkipped = 0;

    for (var i = 0; i < repos.length; ++i) {
        var repo = repos[i];
        if (shjs.test('-d', repo.repoName)) {
            if(!quiet) print('Repo already cloned: ' + repo.repoName);
            numSkipped +=1 ;
        } else if (repo.svn) {
            yield execHelper(ARGS('svn checkout ' + repo.svn + ' ' + repo.repoName));
        } else {
            yield execHelper(ARGS('git clone --progress ' + createRepoUrl(repo)));
        }
    }

    var numCloned = repos.length - numSkipped;
    if (numCloned) {
        print('Successfully cloned ' + numCloned + ' repositories.');
    }
}

function *repoStatusCommand(argv) {
    var opt = registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to report on. Can be specified multiple times to specify multiple branches. The local version of the branch is compared with the origin\'s version unless --b2 is specified.'
         })
        .options('branch2', {
            desc: 'The name of the branch to diff against. This is origin/$branch by default.'
         })
        .options('diff', {
            desc: 'Show a diff of the changes.',
            default: false
         })
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Reports what changes exist locally that are not yet pushed.\n' +
               '\n' +
               'Example usage: $0 repo-status -r auto -b master -b 2.9.x\n' +
               'Example usage: $0 repo-status -r plugins -b dev --branch2 master --diff')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = argv.b && (Array.isArray(argv.b) ? argv.b : [argv.b]);
    var branches2 = branches && argv.branch2 && (Array.isArray(argv.branch2) ? argv.branch2 : [argv.branch2]);
    var repos = computeReposFromFlag(argv.r);

    if (branches2 && branches && branches.length != branches2.length) {
        fatal('Must specify the same number of --branch and --branch2 flags');
    }

    yield forEachRepo(repos, function*(repo) {
        if (repo.svn) {
            print('repo-status not implemented for svn repos');
            return;
        }
        // Determine remote name.
        yield updateRepos([repo], [], true);
        var actualBranches = branches ? branches : /^plugin/.test(repo.id) ? ['dev', 'master'] : ['master'];
        for (var i = 0; i < actualBranches.length; ++i) {
            var branchName = actualBranches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            var targetBranch = branches2 ? branches2[i] : ((yield remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
            var changes = yield execHelper(ARGS('git log --no-merges --oneline ' + targetBranch + '..' + branchName), true);
            if (changes) {
                print('Local commits exist on ' + branchName + ':');
                console.log(changes);
            }
        }
        var gitStatus = yield execHelper(ARGS('git status --short'), true);
        if (gitStatus) {
            print('Uncommitted changes:');
            console.log(gitStatus);
        }
    });
    if (argv.diff) {
        yield forEachRepo(repos, function*(repo) {
            var actualBranches = branches ? branches : [/^plugin/.test(repo.id) ? 'dev' : 'master'];
            for (var i = 0; i < actualBranches.length; ++i) {
                var branchName = actualBranches[i];
                if (!(yield localBranchExists(branchName))) {
                    return;
                }
                var targetBranch = branches2 ? branches2[i] : ((yield remoteBranchExists(repo, branchName)) ? repo.remoteName + '/' + branchName : 'master');
                var diff = yield execHelper(ARGS('git diff ' + targetBranch + '...' + branchName), true);
                if (diff) {
                    print('------------------------------------------------------------------------------');
                    print('Diff for ' + repo.repoName + ' on branch ' + branchName + ' (vs ' + targetBranch + ')');
                    print('------------------------------------------------------------------------------');
                    console.log(diff);
                    console.log('\n');
                }
            }
        });
    }
}

function *repoResetCommand(argv) {
    var opt = registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to reset. Can be specified multiple times to specify multiple branches.',
            default: 'master'
         });
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Resets repository branches to match their upstream state.\n' +
               'Performs the following commands on each:\n' +
               '    git reset --hard origin/$BRANCH_NAME\n' +
               '    git clean -f -d\n' +
               '    if ($BRANCH_NAME exists only locally) then\n' +
               '        git branch -D $BRANCH_NAME\n' +
               '\n' +
               'Usage: $0 repo-reset -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = computeReposFromFlag(argv.r);

    function *cleanRepo(repo) {
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            if (yield remoteBranchExists(repo, branchName)) {
                yield gitCheckout(branchName);
                var changes = yield execHelper(ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName));
                if (changes) {
                    print(repo.repoName + ' on branch ' + branchName + ': Local commits exist. Resetting.');
                    yield execHelper(ARGS('git reset --hard ' + repo.remoteName + '/' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits to reset.');
                }
            } else {
                if ((yield retrieveCurrentBranchName()) == branchName) {
                    yield gitCheckout('master');
                }
                print(repo.repoName + ' deleting local-only branch ' + branchName + '.');
                yield execHelper(ARGS('git log --oneline -3 ' + branchName));
                yield execHelper(ARGS('git branch -D ' + branchName));
            }
        }
    }
    yield forEachRepo(repos, function*(repo) {
        // Determine remote name.
        yield updateRepos([repo], [], true);
        var branchName = yield retrieveCurrentBranchName();
        if (branches.indexOf(branchName) == -1) {
            yield stashAndPop(repo, function*() {
                yield cleanRepo(repo);
            });
        } else {
            yield execHelper(ARGS('git clean -f -d'));
            yield cleanRepo(repo);
        }
    });
}

function *repoPushCommand(argv) {
    var opt = registerRepoFlag(optimist)
    var opt = optimist
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to push. Can be specified multiple times to specify multiple branches.',
            default: ['master', 'dev']
         });
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Pushes changes to the remote repository.\n' +
               '\n' +
               'Usage: $0 repo-push -r auto -b master -b 2.9.x')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = computeReposFromFlag(argv.r);

    yield forEachRepo(repos, function*(repo) {
        // Update first.
        yield updateRepos([repo], branches, false);
        for (var i = 0; i < branches.length; ++i) {
            var branchName = branches[i];
            if (!(yield localBranchExists(branchName))) {
                continue;
            }
            var isNewBranch = !(yield remoteBranchExists(repo, branchName));

            yield gitCheckout(branchName);

            if (isNewBranch) {
                yield execHelper(ARGS('git push --set-upstream ' + repo.remoteName + ' ' + branchName));
            } else {
                var changes = yield execHelper(ARGS('git log --oneline ' + repo.remoteName + '/' + branchName + '..' + branchName), true);
                if (changes) {
                    yield execHelper(ARGS('git push ' + repo.remoteName + ' ' + branchName));
                } else {
                    print(repo.repoName + ' on branch ' + branchName + ': No local commits exist.');
                }
            }
        }
    });
}

function *repoPerformShellCommand(argv) {
    var opt = registerRepoFlag(optimist)
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Performs the supplied shell command in each repo directory.\n' +
               '\n' +
               'Usage: $0 foreach "shell command"')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);
    var cmd = argv._[1];
    yield forEachRepo(repos, function*(repo) {
         yield execHelper(argv._.slice(1), false, true);
    });
}

function *repoUpdateCommand(argv) {
    var opt = registerRepoFlag(optimist)
    var opt = opt
        .options('b', {
            alias: 'branch',
            desc: 'The name of the branch to update. Can be specified multiple times to update multiple branches.',
            default: ['master', 'dev']
         })
        .options('fetch', {
            type: 'boolean',
            desc: 'Use --no-fetch to skip the "git fetch" step.',
            default: true
         });
    opt = registerHelpFlag(opt);
    var argv = opt
        .usage('Updates git repositories by performing the following commands:\n' +
               '    save active branch\n' +
               '    git fetch $REMOTE \n' +
               '    git stash\n' +
               '    for each specified branch:\n' +
               '        git checkout $BRANCH\n' +
               '        git rebase $REMOTE/$BRANCH\n' +
               '        git checkout -\n' +
               '    git checkout $SAVED_ACTIVE_BRANCH\n' +
               '    git stash pop\n' +
               '\n' +
               'Usage: $0 repo-update')
        .argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var branches = Array.isArray(argv.b) ? argv.b : [argv.b];
    var repos = computeReposFromFlag(argv.r);

    // ensure that any missing repos are cloned
    yield cloneRepos(repos,true);
    yield updateRepos(repos, branches, !argv.fetch);
}

function *determineApacheRemote(repo) {
    var fields = (yield execHelper(ARGS('git remote -v'), true)).split(/\s+/);
    var ret = null;
    for (var i = 1; i < fields.length; i += 3) {
        ['git-wip-us.apache.org/repos/asf/', 'git.apache.org/'].forEach(function(validRepo) {
            if (fields[i].indexOf(validRepo + repo.repoName) != -1) {
                ret = fields[i - 1];
            }
        });
    }
    if (ret)
        return ret;
    fatal('Could not find an apache remote for repo ' + repo.repoName);
}

function *pendingChangesExist() {
    return !!(yield execHelper(ARGS('git status --porcelain'), true));
}

function *stashAndPop(repo, func) {
    var requiresStash = yield pendingChangesExist();
    var branchName = yield retrieveCurrentBranchName();

    if (requiresStash) {
        yield execHelper(ARGS('git stash save --all --quiet', 'coho stash'));
    }

    yield func();

    yield gitCheckout(branchName);
    if (requiresStash) {
        yield execHelper(ARGS('git stash pop'));
    }
}

function *updateRepos(repos, branches, noFetch) {
    // Pre-fetch checks.
    yield forEachRepo(repos, function*(repo) {
        if (repo.svn) {
            return;
        }
        // Ensure it's on a named branch.
        yield retrieveCurrentBranchName();
        // Find the apache remote.
        if (!repo.remoteName) {
            repo.remoteName = yield determineApacheRemote(repo);
        }
    });

    if (!noFetch) {
        yield forEachRepo(repos, function*(repo) {
            if (repo.svn) {
                return;
            }
            // TODO - can these be combined? Fetching with --tags seems to not pull in changes...
            yield execHelper(ARGS('git fetch --progress ' + repo.remoteName));
            yield execHelper(ARGS('git fetch --progress --tags ' + repo.remoteName));
        });
    }

    if (branches && branches.length) {
        yield forEachRepo(repos, function*(repo) {
            if (repo.svn) {
                yield execHelper(ARGS('svn up'));
                return;
            }
            var staleBranches = {};
            for (var i = 0; i < branches.length; ++i) {
                var branchName = branches[i];
                if (yield remoteBranchExists(repo, branches[i])) {
                    var changes = yield execHelper(ARGS('git log --oneline ' + branchName + '..' + repo.remoteName + '/' + branchName), true, true);
                    staleBranches[branchName] = !!changes;
                }
            }
            var staleBranches = branches.filter(function(branchName) {
                return !!staleBranches[branchName];
            });
            if (!staleBranches.length) {
                print('Confirmed already up-to-date: ' + repo.repoName);
            } else {
                print('Updating ' + repo.repoName);
                yield stashAndPop(repo, function*() {
                    for (var i = 0; i < staleBranches.length; ++i) {
                        var branchName = staleBranches[i];
                        yield gitCheckout(branchName);
                        var ret = yield execHelper(ARGS('git rebase ' + repo.remoteName + '/' + branchName), false, true);
                        if (ret === null) {
                            console.log('\n\nUpdate failed. Run again with --no-fetch to try again without re-fetching.');
                            process.exit(1);
                        }
                    }
                });
            }
        });
    }
}

function configureReleaseCommandFlags(opt) {
    var opt = registerRepoFlag(opt)
    opt = opt
        .options('version', {
            desc: 'The version to use for the branch. Must match the pattern #.#.#[-rc#]',
            demand: true
         });
    opt = registerHelpFlag(opt);
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var version = validateVersionString(argv.version);
    return argv;
}

var hasBuiltJs = '';

function *updateJsSnapshot(repo, version) {
    function *ensureJsIsBuilt() {
        var cordovaJsRepo = getRepoById('js');
        if (hasBuiltJs != version) {
            yield forEachRepo([cordovaJsRepo], function*() {
                yield stashAndPop(cordovaJsRepo, function*() {
                    if (getVersionBranchName(version) == 'master') {
                        yield gitCheckout('master');
                    } else {
                        yield gitCheckout(version);
                    }
                    yield execHelper(ARGS('grunt'));
                    hasBuiltJs = version;
                });
            });
        }
    }

    if (platformRepos.indexOf(repo) == -1) {
        return;
    }

    if (repo.cordovaJsPaths) {
        yield ensureJsIsBuilt();
        repo.cordovaJsPaths.forEach(function(jsPath) {
            var src = path.join('..', 'cordova-js', 'pkg', repo.cordovaJsSrcName || ('cordova.' + repo.id + '.js'));
            cpAndLog(src, jsPath);
        });
        if (yield pendingChangesExist()) {
            yield execHelper(ARGS('git commit -am', 'Update JS snapshot to version ' + version + ' (via coho)'));
        }
    } else if (allRepos.indexOf(repo) != -1) {
        print('*** DO NOT KNOW HOW TO UPDATE cordova.js FOR THIS REPO ***');
    }
}

function *updateRepoVersion(repo, version) {
    // Update the VERSION files.
    var versionFilePaths = repo.versionFilePaths || ['VERSION'];
    if (fs.existsSync(versionFilePaths[0])) {
        versionFilePaths.forEach(function(versionFilePath) {
            fs.writeFileSync(versionFilePath, version + '\n');
        });
        shjs.config.fatal = true;
        if (repo.id == 'android') {
            shjs.sed('-i', /CORDOVA_VERSION.*=.*;/, 'CORDOVA_VERSION = "' + version + '";', path.join('framework', 'src', 'org', 'apache', 'cordova', 'CordovaWebView.java'));
            shjs.sed('-i', /VERSION.*=.*;/, 'VERSION = "' + version + '";', path.join('bin', 'templates', 'cordova', 'version'));
        }
        shjs.config.fatal = false;
        if (!(yield pendingChangesExist())) {
            print('VERSION file was already up-to-date.');
        }
    } else {
        console.warn('No VERSION file exists in repo ' + repo.repoName);
    }

    if (yield pendingChangesExist()) {
        yield execHelper(ARGS('git commit -am', 'Set VERSION to ' + version + ' (via coho)'));
    }
}

function *prepareReleaseBranchCommand() {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Prepares release branches but does not create tags. This includes:\n' +
               '    1. Creating the branch if it doesn\'t already exist\n' +
               '    2. Updating cordova.js snapshot and VERSION file.\n' +
               '\n' +
               'Command is safe to run multiple times, and can be run for the purpose\n' +
               'of checking out existing release branches.\n' +
               '\n' +
               'Command can also be used to update the JS snapshot after release \n' +
               'branches have been created.\n' +
               '\n' +
               'Usage: $0 prepare-release-branch --version=2.8.0-rc1')
    );
    var repos = computeReposFromFlag(argv.r);
    var version = validateVersionString(argv.version);
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield updateRepos(repos, [], true);

    var cordovaJsRepo = getRepoById('js');

    // Ensure cordova-js comes first.
    var repoIndex = repos.indexOf(cordovaJsRepo);
    if (repoIndex != -1) {
        repos.splice(repoIndex, 1);
        repos.unshift(cordovaJsRepo);
    }

    yield forEachRepo(repos, function*(repo) {
        yield stashAndPop(repo, function*() {
            // git fetch + update master
            yield updateRepos([repo], ['master'], false);

            // Either create or pull down the branch.
            if (yield remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                // Check out and rebase.
                yield updateRepos([repo], [branchName], true);
                yield gitCheckout(branchName);
            } else if (yield localBranchExists(branchName)) {
                yield execHelper(ARGS('git checkout ' + branchName));
            } else {
                yield gitCheckout('master');
                yield execHelper(ARGS('git checkout -b ' + branchName));
            }
            yield updateJsSnapshot(repo, version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + version + '" on branch + "' + branchName + '".');
            yield updateRepoVersion(repo, version);

            yield gitCheckout('master');
            var devVersion = createPlatformDevVersion(version);
            print(repo.repoName + ': ' + 'Setting VERSION to "' + devVersion + '" on branch + "master".');
            yield updateRepoVersion(repo, devVersion);
            yield updateJsSnapshot(repo, devVersion);
            yield gitCheckout(branchName);
        });
    });

    reportGitPushResult(repos, ['master', branchName]);
}

function *tagReleaseBranchCommand(argv) {
    var argv = configureReleaseCommandFlags(optimist
        .usage('Tags a release branches.\n' +
               '\n' +
               'Usage: $0 tag-release --version=2.8.0-rc1')
        .options('pretend', {
            desc: 'Don\'t actually run git commands, just print out what would be run.',
         })
    );
    var repos = computeReposFromFlag(argv.r);
    var version = validateVersionString(argv.version);
    var pretend = argv.pretend;
    var branchName = getVersionBranchName(version);

    // First - perform precondition checks.
    yield updateRepos(repos, [], true);

    function *execOrPretend(cmd) {
        if (pretend) {
            print('PRETENDING TO RUN: ' + cmd.join(' '));
        } else {
            yield execHelper(cmd);
        }
    }
    yield forEachRepo(repos, function*(repo) {
        yield stashAndPop(repo, function*() {
            // git fetch.
            yield updateRepos([repo], [], false);

            if (yield remoteBranchExists(repo, branchName)) {
                print('Remote branch already exists for repo: ' + repo.repoName);
                yield gitCheckout(branchName);
            } else {
                fatal('Release branch does not exist for repo ' + repo.repoName);
            }

            // git merge
            yield updateRepos([repo], [branchName], true);

            // Create/update the tag.
            var tagName = yield retrieveCurrentTagName();
            if (tagName != version) {
                if (yield tagExists(version)) {
                    yield execOrPretend(ARGS('git tag ' + version + ' --force'));
                } else {
                    yield execOrPretend(ARGS('git tag ' + version));
                }
                yield execOrPretend(ARGS('git push --tags ' + repo.remoteName + ' ' + branchName));
            } else {
                print('Repo ' + repo.repoName + ' is already tagged.');
            }
        });
    });

    print('');
    print('All work complete.');
}

function *lastWeekCommand() {
    var opt = registerRepoFlag(optimist);
    opt = registerHelpFlag(opt);
    opt.usage('Shows formatted git log for changes in the past 7 days.\n' +
              '\n' +
              'Usage: $0 last-week [--repo=ios] [--me] [--days=7]\n' +
              '    --me: Show only your commits\n' +
              '    --days=n: Show commits from the past n days');
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);
    var filterByEmail = !!argv.me;
    var days = argv.days || 7;
    var userEmail = filterByEmail && (yield execHelper(ARGS('git config user.email'), true));
    var commitCount = 0;
    var pullRequestCount = 0;

    var cmd = ARGS('git log --no-merges --date=short --all-match --fixed-strings');
    if (filterByEmail) {
        cmd.push('--committer=' + userEmail, '--author=' + userEmail);
    }

    print('Running command: ' + cmd.join(' ') + ' --format="$REPO_NAME %s" --since="' + days + ' days ago"');
    yield forEachRepo(repos, function*(repo) {
        var repoName = repo.id + new Array(Math.max(0, 20 - repo.id.length + 1)).join(' ');
        var output = yield execHelper(cmd.concat(['--format=' + repoName + ' %cd %s',
            '--since=' + days + ' days ago']), true);
        if (output) {
            console.log(output);
            commitCount += output.split('\n').length;
        }
    });

    if (filterByEmail) {
        console.log('\nPull requests:');
        cmd = ARGS('git log --no-merges --date=short --fixed-strings', '--committer=' + userEmail);
        yield forEachRepo(repos, function*(repo) {
            var repoName = repo.id + new Array(Math.max(0, 20 - repo.id.length + 1)).join(' ');
            var output = yield execHelper(cmd.concat(['--format=%ae|' + repoName + ' %cd %s',
                '--since=' + days + ' days ago']), true);
            if (output) {
                output.split('\n').forEach(function(line) {
                    line = line.replace(/(.*?)\|/, '');
                    if (RegExp.lastParen.indexOf(userEmail) == -1) {
                        console.log(line);
                        pullRequestCount += 1;
                    }
                });
            }
        });
    }

    console.log('');
    if (filterByEmail) {
        console.log('Total Commits: ' + commitCount + ' Total Pull Requests: ' + pullRequestCount);
    } else {
        console.log('Total Commits: ' + commitCount);
    }
}

function *ratCommand() {
    var opt = registerRepoFlag(optimist);
    opt = registerHelpFlag(opt);
    opt.usage('Uses Apache RAT to audit source files for license headers.\n' +
              '\n' +
              'Usage: $0 audit-license-headers --repo=ios')
    argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var repos = computeReposFromFlag(argv.r);
    // Check that RAT command exists.
    var ratName = 'apache-rat-0.10';
    var ratUrl = "https://dist.apache.org/repos/dist/release/creadur/apache-rat-0.10/apache-rat-0.10-bin.tar.gz";
    var ratPath;
    yield forEachRepo([getRepoById('coho')], function*() {
        ratPath = path.join(process.cwd(), ratName, ratName+'.jar');
    });
    if (!fs.existsSync(ratPath)) {
        print('RAT tool not found, downloading to: ' + ratPath);
        yield forEachRepo([getRepoById('coho')], function*() {
            if (shjs.which('curl')) {
                yield execHelper(['sh', '-c', 'curl "' + ratUrl + '" | tar xz']);
            } else {
                yield execHelper(['sh', '-c', 'wget -O - "' + ratUrl + '" | tar xz']);
            }
        });
        if (!fs.existsSync(ratPath)) {
            fatal('Download failed.');
        }
    }
    print('\x1B[31mNote: ignore filters exist and often need updating within coho.\x1B[39m');
    yield forEachRepo(repos, function*(repo) {
        var allExcludes = COMMON_RAT_EXCLUDES;
        if (repo.ratExcludes) {
            allExcludes = allExcludes.concat(repo.ratExcludes);
        }
        var excludeFlags = [];
        allExcludes.forEach(function(e) {
            excludeFlags.push('-e', e);
        });
        yield execHelper(ARGS('java -jar', ratPath, '-d', '.').concat(excludeFlags));
    });
}

function sendCreateIssueRequest(issue, username, password, pretend, callback) {
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    requestToSend = {
        'uri':JIRA_API_URL + 'issue',
        'headers':{
            'Authorization':auth
        },
        'json':issue
    };
    print('creating jira issue: ' + issue.fields.summary);
    if (!pretend) {
        request.post(requestToSend, callback);
    } else {
        print('sending request:');
        console.log(JSON.stringify(requestToSend, null, 2));
        callback(null, { 'statuscode':0 }, { 'key':'1234567' });
    }
}

function sendCreateSubtaskRequests(request_queue, username, password, pretend) {
    if (request_queue.length == 0) {
        return;
    }
    sendCreateIssueRequest(request_queue.shift(), username, password, pretend, function(err, res, body) {
        if (err) {
            print('there was an error creating subtask.');
        } else if (res.statuscode >= 400) {
            print('got http status ' + res.statuscode + ' during subtask creation.');
            print(body);
        } else {
            sendCreateSubtaskRequests(request_queue, username, password, pretend);
        }
    });
}

function makeSubtask(parent_key, summary, description, component_ids, version_id) {
    var components = [];
    component_ids.forEach(function(component_id) {
        components.push({'id':component_id});
    });
    return {
        'fields':{
            'project':{
                'key':JIRA_PROJECT_KEY
            },
            'parent':{
                'key':parent_key
            },
            'summary':summary,
            'description':description,
            'issuetype':{
                'name':'Sub-task'
            },
            'components':components,
            'fixVersions': [{
                'id':version_id
            }]
        },
    };
}

function createReleaseBug(version, root_version, prev_version, version_id, username, password, component_map, pretend) {
    var subjectPrefix = '[Release + ' + version + '] ';
    var workflow_link = 'Workflow here:\nhttp://wiki.apache.org/cordova/CuttingReleases';
    var parent_issue = {
        'fields':{
            'project':{
                'key':JIRA_PROJECT_KEY
            },
            'summary':subjectPrefix + 'Parent Issue',
            'description':'Parent bug for the ' + version + ' Cordova Release.\n\n' + workflow_link +
                          '\n\nRelease Master: ?\n\nComponent Leads: Refer to assignee of "Test & Tag" sub-tasks.\n',
            'issuetype':{
                'name':'Task'
            },
            'fixVersions': [{
                'id':version_id
            }],
            'components': []
        }
    };
    function componentsForRepos(repos) {
        return repos.map(function(repo) {
            if (!component_map[repo.jiraComponentName]) {
                fatal('Unable to find component ' + repo.jiraComponentName + ' in JIRA.');
            }
            return component_map[repo.jiraComponentName];
        });
    }
    var all_components = componentsForRepos(repoGroups['cadence']);
    all_components.forEach(function(component_id) {
        parent_issue.fields.components.push({'id':component_id});
    });

    sendCreateIssueRequest(parent_issue, username, password, pretend, function(err, res, body) {
        if (err) {
            fatal('Error creating parent issue: ' + err);
        }
        var parent_key = body.key;
        if (!parent_key) {
            fatal('No ID retrieved for created parent issue. Aborting.');
        }
        var request_queue = [];
        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Branch & Test & Tag RC1 for: cordova-js, cordova-mobile-spec and cordova-app-hello-world',
                                       'Refer to ' + workflow_link, componentsForRepos([getRepoById('js'), getRepoById('mobile-spec'), getRepoById('app-hello-world')]), version_id));
        repoGroups['active-platform'].forEach(function(repo) {
            request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Branch & Test & Tag RC1 for ' + repo.title, 'Refer to ' + workflow_link,
                                           componentsForRepos([repo]), version_id));
        });
        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Branch & Tag RC1 of cordova-cli',
                                       'Refer to ' + workflow_link, componentsForRepos([getRepoById('cli')]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Upload docs without switching default',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Create blog post for RC1 & Announce',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        repoGroups['active-platform'].forEach(function(repo) {
            request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Test & Tag ' + version + ' for ' + repo.title, 'Refer to ' + workflow_link,
                                           componentsForRepos([repo]), version_id));
        });

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Test & Tag ' + version + ' of cordova-cli',
                                       'Refer to ' + workflow_link, componentsForRepos([getRepoById('cli')]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Create blog post for final release & get reviewed',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Upload signed release .zip to Apache Dist',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Change default docs to new version',
                                       'Refer to ' + workflow_link, componentsForRepos([]), version_id));

        request_queue.push(makeSubtask(parent_key, subjectPrefix + 'Announce Release',
                                       'Refer to ' + workflow_link, all_components, version_id));
        sendCreateSubtaskRequests(request_queue, username, password, pretend);
    });
}

function *createReleaseBugCommand() {
    var opt = registerHelpFlag(optimist);
    opt = opt.options('version', {
        desc: 'The version to use for the branch. Must match the pattern #.#.#',
        demand: true
    }).options('username', {
        desc: 'Username to use when creating issues in JIRA',
        demand: true
    }).options('password', {
        desc: 'Password to use when creating issues in JIRA',
        demand: true
    }).options('pretend', {
        desc: 'Instead of creating issues in JIRA, print the issue creation requests that would have been sent instead'
    });
    opt.usage('Creates an issue in JIRA for releasing a new version of Cordova, including creating all subtasks.\n' +
              '\n' +
              'Usage: $0 create-release-bug --version=3.0.0 --username=Alice --password=Passw0rd');
    var argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }
    var version = validateVersionString(argv.version);
    if (version.indexOf('-') != -1) {
        fatal('Don\'t append "-rc" for release bugs.');
    }

    request.get(JIRA_API_URL + 'project/' + JIRA_PROJECT_KEY + '/components', function(err, res, components) {
        if (err) {
            fatal('Error getting components from JIRA: ' + err);
        } else if (!components) {
            fatal('Error: JIRA returned no components');
        }
        components = JSON.parse(components);
        var component_map = {};
        components.forEach(function(component) {
            component_map[component.name] = component.id;
        });

        request.get(JIRA_API_URL + 'project/' + JIRA_PROJECT_KEY + '/versions', function(err, res, versions) {
            if (err) {
                fatal('Error getting versions from JIRA: ' + err);
            } else if (!versions) {
                fatal('Error: JIRA returned no versions');
            }
            versions = JSON.parse(versions);
            var root_version = version;
            var version_id = null;
            var prev_version = null;
            if (version.indexOf('r') > -1) {
                root_version = version.substr(0, version.indexOf('r'));
            }
            for (var i = 0; i < versions.length; i++) {
                if (versions[i].name == root_version) {
                    version_id = versions[i].id;
                    prev_version = versions[i - 1].name;
                    break;
                }
            }
            if (!version_id) {
                fatal('Cannot find version ID number in JIRA related to "root" version string: ' + version);
            }
            createReleaseBug(version, root_version, prev_version, version_id, argv.username, argv.password, component_map,
                             argv.pretend);
        });
    });
}

var commentFailed = false;
function addLastCommentInfo(repo, pullRequests, callback) {
    var remaining = pullRequests.length;
    pullRequests.forEach(function(pullRequest) {
        // review_comments_url is always empty, so resort to scraping.
        request.get({ url: 'https://github.com/apache/' + repo + '/pull/' + pullRequest.number, headers: { 'User-Agent': 'Cordova Coho' }}, function(err, res, payload) {
            if (err) {
                if (!commentFailed) {
                    commentFailed = true;
                    console.warn('Pull request scrape request failed: ' + err);
                }
            } else {
                var m = /[\s\S]*timeline-comment-header[\s\S]*?"author".*?>(.*?)</.exec(payload);
                pullRequest.lastUpdatedBy = m && m[1] || '';
            }
            if (--remaining === 0) {
                callback();
            }
        });
    });
}

function listGitHubPullRequests(repo, maxAge, hideUser, callback) {
    var url = GITHUB_API_URL + 'repos/' + GITHUB_ORGANIZATION + '/' + repo + '/pulls';

    request.get({ url: url, headers: { 'User-Agent': 'Cordova Coho' }}, function(err, res, pullRequests) {
        if (err) {
            fatal('Error getting pull requests from GitHub: ' + err);
        } else if (!pullRequests) {
            fatal('Error: GitHub returned no pull requests');
        } else if (res.headers['x-ratelimit-remaining'] && res.headers['x-ratelimit-remaining'] == 0) {
            var resetEpoch = new Date(res.headers['x-ratelimit-reset'] * 1000);
            var expiration = resetEpoch.getHours() + ":" + resetEpoch.getMinutes() + ":" + resetEpoch.getSeconds();
            fatal('Error: GitHub rate limit exceeded, wait till ' + expiration + ' before trying again.\n' +
                'See http://developer.github.com/v3/#rate-limiting for details.');
        }

        pullRequests = JSON.parse(pullRequests);
        var origCount = pullRequests.length;

        pullRequests = pullRequests.filter(function(p) {
            var updatedDate = new Date(p.updated_at);
            var daysAgo = Math.round((new Date() - updatedDate) / (60 * 60 * 24 * 1000));
            return daysAgo < maxAge;
        });
        var countAfterDateFilter = pullRequests.length;

        addLastCommentInfo(repo, pullRequests, next);

        function next() {
            if (hideUser) {
                pullRequests = pullRequests.filter(function(p) {
                    return p.lastUpdatedBy != hideUser;
                });
            }
            var count = pullRequests.length;

            pullRequests.sort(function(a,b) {return (a.updated_at > b.updated_at) ? -1 : ((b.updated_at > a.updated_at) ? 1 : 0);} );

            var countMsg = count + ' Pull Requests';
            if (countAfterDateFilter !== origCount || count !== countAfterDateFilter) {
                countMsg += ' (plus ';
            }
            if (countAfterDateFilter !== origCount) {
                countMsg += (origCount - countAfterDateFilter) + ' old';
                if (count !== countAfterDateFilter) {
                    countMsg += ', ';
                }
            }
            if (count !== countAfterDateFilter) {
                countMsg += (countAfterDateFilter - count) + ' stale';
            }
            if (countAfterDateFilter !== origCount || count !== countAfterDateFilter) {
                countMsg += ')';
            }
            console.log('\x1B[31m========= ' + repo + ': ' + countMsg + '. =========\x1B[39m');

            pullRequests.forEach(function(pullRequest) {
                var updatedDate = new Date(pullRequest.updated_at);
                var daysAgo = Math.round((new Date() - updatedDate) / (60 * 60 * 24 * 1000));
                console.log('\x1B[33m-----------------------------------------------------------------------------------------------\x1B[39m');
                console.log(pullRequest.user.login + ': ' + pullRequest.title + ' (\x1B[31m' + (pullRequest.lastUpdatedBy || '<no comments>') + ' ' + daysAgo + ' days ago\x1B[39m)');
                console.log('\x1B[33m-----------------------------------------------------------------------------------------------\x1B[39m');
                console.log('* ' + pullRequest.html_url);
                // console.log('To merge: curl "' + pullRequest.patch_url + '" | git am');
                if (!pullRequest.head.repo) {
                    console.log('NO REPO EXISTS!');
                } else {
                    console.log('To merge: git pull ' + pullRequest.head.repo.clone_url + ' ' + pullRequest.head.ref);
                }
                if (pullRequest.body) {
                    console.log(pullRequest.body);
                }
                console.log('');
            });
            callback();
        }
    });
}

function *listPullRequestsCommand() {
    var opt = registerHelpFlag(optimist);
    opt = registerRepoFlag(opt)
        .options('max-age', {
            desc: 'Don\'t show pulls older than this (in days)',
            type: 'number',
            default: 1000
         })
        .options('hide-user', {
            desc: 'Hide PRs where the last comment\'s is by this github user.',
            type: 'string'
         });
    opt.usage('Reports what GitHub pull requests are open for the given repositories.\n' +
               '\n' +
               'Example usage: $0 list-pulls --hide-user="agrieve" | tee pulls.list | less -R\n' +
               'Example usage: $0 list-pulls --max-age=365 -r plugins\n' +
               '\n' +
               'Please note that GitHub rate limiting applies. See http://developer.github.com/v3/#rate-limiting for details.\n');
    var argv = opt.argv;

    if (argv.h) {
        optimist.showHelp();
        process.exit(1);
    }

    var repos = computeReposFromFlag(argv.r)

    function next() {
        if (repos.length) {
            var repo = repos.shift();
            listGitHubPullRequests(repo.repoName, argv['max-age'], argv['hide-user'], next);
        }
    }
    next();
}

function main() {
    var commandList = [
        {
            name: 'repo-clone',
            desc: 'Clones git repositories into the current working directory.',
            entryPoint: repoCloneCommand
        }, {
            name: 'repo-update',
            desc: 'Performs git pull --rebase on all specified repositories.',
            entryPoint: repoUpdateCommand
        }, {
            name: 'repo-reset',
            desc: 'Performs git reset --hard origin/$BRANCH and git clean -f -d on all specified repositories.',
            entryPoint: repoResetCommand
        }, {
            name: 'repo-status',
            desc: 'Lists changes that exist locally but have not yet been pushed.',
            entryPoint: repoStatusCommand
        }, {
            name: 'repo-push',
            desc: 'Push changes that exist locally but have not yet been pushed.',
            entryPoint: repoPushCommand
        }, {
            name: 'list-repos',
            desc: 'Shows a list of valid values for the --repo flag.',
            entryPoint: listReposCommand
        }, {
            name: 'list-pulls',
            desc: 'Shows a list of GitHub pull requests for all specified repositories.',
            entryPoint: listPullRequestsCommand
        }, {
            name: 'prepare-release-branch',
            desc: 'Branches, updates JS, updates VERSION. Safe to run multiple times.',
            entryPoint: prepareReleaseBranchCommand
        }, {
            name: 'tag-release',
            desc: 'Tags repos for a release.',
            entryPoint: tagReleaseBranchCommand
        }, {
            name: 'audit-license-headers',
            desc: 'Uses Apache RAT to look for missing license headers.',
            entryPoint: ratCommand
        }, {
            name: 'create-release-bug',
            desc: 'Creates a bug in JIRA for tracking the tasks involved in a new release',
            entryPoint: createReleaseBugCommand
        }, {
            name: 'create-archive',
            desc: 'Zips up a tag, signs it, and adds checksum files.',
            entryPoint: createArchiveCommand
        }, {
            name: 'verify-archive',
            desc: 'Checks that archives are properly signed and hashed.',
            entryPoint: verifyArchiveCommand
        }, {
            name: 'print-tags',
            desc: 'Prints out tags & hashes for the given repos. Used in VOTE emails.',
            entryPoint: printTagsCommand
        }, {
            name: 'last-week',
            desc: 'Prints out git logs of things that happened last week.',
            entryPoint: lastWeekCommand
        }, {
            name: 'foreach',
            desc: 'Runs a shell command in each repo.',
            entryPoint: repoPerformShellCommand
        }, {
            name: 'list-release-urls',
            desc: 'List the apache git repo urls for release artifacts.',
            entryPoint: listReleaseUrls
        }
    ];
    var commandMap = {};
    for (var i = 0; i < commandList.length; ++i) {
        commandMap[commandList[i].name] = commandList[i];
    }
    var usage = 'Usage: $0 command [options]\n' +
               '\n' +
               'Valid commands:\n';
    for (var i = 0; i < commandList.length; ++i) {
        usage += '    ' + commandList[i].name + ': ' + commandList[i].desc + '\n';
    }
    usage += '\nFor help on a specific command: $0 command --help\n\n';
    usage += 'Some examples:\n';
    usage += '    ./cordova-coho/coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli\n';
    usage += '    ./cordova-coho/coho repo-update\n';
    usage += '    ./cordova-coho/coho foreach -r plugins "git checkout master"\n';
    usage += '    ./cordova-coho/coho foreach -r plugins "git clean -fd"\n';
    usage += '    ./cordova-coho/coho last-week --me';

    var command;
    var argv = optimist
        .usage(usage)
        .check(function(argv) {
            command = argv._[0];
            if (!command) {
                throw 'No command specified.';
            }
            if (!commandMap[command]) {
                throw 'Unknown command: ' + command;
            }
        }).argv;

    var entry = commandMap[command].entryPoint;
    co(entry)();
}
main();