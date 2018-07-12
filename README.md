github-release-downloader
-------------------------

[![Build Status](https://travis-ci.org/Fohlen/github-release-downloader.svg?branch=master)](https://travis-ci.org/Fohlen/github-release-downloader)

A tiny Promise-compliant wrapper around [requests](https://github.com/request/request) to download release assets from [GitHub](https://github.com).
I use [mocha](https://mochajs.org/), [eslint](https://eslint.org/) and [Travis](https://travis-ci.org/) for code quality. Also [jsdoc-to-markdown](https://www.npmjs.com/package/jsdoc-to-markdown) is a great help in creating this `README`.

# Get started
To get started, simply install this module via (if you plan using it without progress or command line):
```
npm i github-release-downloader --save --no-optional
```

Once that's done you can simply `require` the downloader in your code
```
const releaseDownloader = require('github-release-downloader');

releaseDownloader.downloadByPlatformArch('inexorgame/inexor-core').then((downloaded) => {
    console.log(`Hooray! It downloaded my archive at ${downloaed}!`)
}).catch((err) => {
    console.error('omighosh, seems like this platform is not supported')
})
```

### Command line
You can also use this package as a small command-line wrapper to download stuff from GitHub.
```
npm i github-release-downloader -g
```

Then go ahead and enjoy the command line,
```
github-release-downloader --help
```

### Use progress for download progress
You can also pass an optional callback to the `downloadAsset` function.
Given you use [progress](https://github.com/visionmedia/node-progress#readme) that would look like
```
const releaseDownloader = require('github-release-downloader');
const progress = require('progress');

releaseDownloader.getVersion('inexorgame/inexor-core').then((release) => {
    releaseDownloader.getAssetByPlatformArch(release).then((asset) => {
        let progressBar = new ProgressBar(':bar:', { total: asset.size })
        
        releaseDownloader.downloadAsset(asset.url, asset.name, (chunk) => {
            progressBar.tick((asset.size - chunk))
        }).then((downloaded) => {
            console.log(`Successfully downloaded file to ${downloaded}`)
        })
    })
})
```

#### Improvement ideas
There's surely plenty room for improvement, and I appreciate pull requests.
I think that support for authentication is indeed most needed right now, because the [api limit](https://developer.github.com/v3/rate_limit/) can be rather harsh.

#API
## Functions

<dl>
<dt><a href="#getReleaseList">getReleaseList(repo)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Retrieves versions and their associated assets</p>
</dd>
<dt><a href="#getReleaseByVersion">getReleaseByVersion(repo, range)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Retrieves the assets of a specific release or tries to match a release using the semver</p>
</dd>
<dt><a href="#getAssetByPlatformArch">getAssetByPlatformArch(release, platform, arch)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>Tries to match an asset of a release for specific platform and arch.
Using <code>platform=&quot;&quot;, arch=&quot;&quot;</code> behaves like a wildcard.</p>
</dd>
<dt><a href="#downloadAsset">downloadAsset(url, name, dir, [progress])</a> ⇒ <code>Promise.&lt;string&gt;</code></dt>
<dd><p>Downloads a release asset from GitHub.
Calls the progress callback with the chunk length progressively. You can get the file size via @see getAssetByPlatformArch</p>
</dd>
<dt><a href="#downloadAssetByPlatformArch">downloadAssetByPlatformArch(repo, range, dir, platform, arch)</a> ⇒ <code>Promise.&lt;string&gt;</code></dt>
<dd><p>Tries to download given release by range for specified platform and arch.
If the architecture+platform cannot be matched the promise will be rejected.</p>
</dd>
</dl>

<a name="getReleaseList"></a>

## getReleaseList(repo) ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves versions and their associated assets

**Kind**: global function  
**See**: [https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository](https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository)  

| Param | Type | Description |
| --- | --- | --- |
| repo | <code>string</code> | the name of the GitHub name+repo, e.g fohlen/github-release-downloader |

<a name="getReleaseByVersion"></a>

## getReleaseByVersion(repo, range) ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves the assets of a specific release or tries to match a release using the semver

**Kind**: global function  
**See**: [https://developer.github.com/v3/repos/releases/#get-a-single-release](https://developer.github.com/v3/repos/releases/#get-a-single-release)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| repo | <code>string</code> |  | the name of the GitHub name+repo, e.g fohlen/github-release-downloader |
| range | <code>string</code> | <code>&quot;latest&quot;</code> | [range=latest] - semver range |

<a name="getAssetByPlatformArch"></a>

## getAssetByPlatformArch(release, platform, arch) ⇒ <code>Promise.&lt;Object&gt;</code>
Tries to match an asset of a release for specific platform and arch.
Using `platform="", arch=""` behaves like a wildcard.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| release | <code>Object</code> | a GitHub release object |
| platform | <code>string</code> | [platform=os.platform()] - one of the supported platforms of os.platform |
| arch | <code>string</code> | [arch=os.arch()] - one of the supported architectures of os.arch |

<a name="downloadAsset"></a>

## downloadAsset(url, name, dir, [progress]) ⇒ <code>Promise.&lt;string&gt;</code>
Downloads a release asset from GitHub.
Calls the progress callback with the chunk length progressively. You can get the file size via @see getAssetByPlatformArch

**Kind**: global function  
**Returns**: <code>Promise.&lt;string&gt;</code> - - the path of the downloaded file  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| url | <code>string</code> |  |  |
| name | <code>string</code> |  |  |
| dir | <code>string</code> |  | [directory=process.cwd()] - an optional download path |
| [progress] | <code>function</code> | <code></code> | an optional callback to hook into with asset download |

<a name="downloadAssetByPlatformArch"></a>

## downloadAssetByPlatformArch(repo, range, dir, platform, arch) ⇒ <code>Promise.&lt;string&gt;</code>
Tries to download given release by range for specified platform and arch.
If the architecture+platform cannot be matched the promise will be rejected.

**Kind**: global function  
**Returns**: <code>Promise.&lt;string&gt;</code> - - the path of the downloaded file  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| repo | <code>string</code> |  | the name of the GitHub name+repo, e.g fohlen/github-release-downloader |
| range | <code>string</code> | <code>&quot;latest&quot;</code> | [range=latest] - semver range |
| dir | <code>string</code> |  | [directory=process.cwd()] - an optional download path |
| platform | <code>string</code> |  | [platform=os.platform()] - one of the supported platforms of os.platform |
| arch | <code>string</code> |  | [arch=os.arch()] - one of the supported architectures of os.arch |

