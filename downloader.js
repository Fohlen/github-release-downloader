const path = require('path')
const fs = require('fs')
const os = require('os')
const process = require('process')
const request = require('request')
const rp = require('request-promise-native')
const semver = require('semver')


/**
 * Retrieves versions and their associated assets
 * @param {string} repo - the name of the GitHub name+repo, e.g fohlen/github-release-downloader
 * @returns {Promise<Object>}
 * @see {@link https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository}
 */
function getReleaseList (repo) {
	return new Promise((resolve, reject) => {
		rp.get({
			uri: `https://api.github.com/repos/${repo}/releases`, // this will only fetch page 1 so it's not ideal for extensive range matches
			headers: {
				'User-Agent': 'Github-Release-Downloader'
			},
			json: true
		}).then((releases) => {
			resolve(releases)
		}).catch((err) => {
			reject(err)
		})
	})
}
module.exports.getReleaseList = getReleaseList


/**
 * Retrieves the assets of a specific release or tries to match a release using the semver
 * @param {string} repo - the name of the GitHub name+repo, e.g fohlen/github-release-downloader
 * @param {string} range [range=latest] - semver range
 * @returns {Promise<Object>}
 * @see {@link https://developer.github.com/v3/repos/releases/#get-a-single-release}
 */
function getReleaseByVersion (repo, range='latest') {
	return new Promise((resolve, reject) => {
		module.exports.getReleaseList(repo).then((releases) => {
			releases = releases.map((release) => {
				release.tag_name = semver.coerce(release.tag_name)
				return release
			})

			releases = releases.filter((release) => semver.valid(release.tag_name))

			let versions = releases.map((release) => {
				return release.tag_name
			})

			if (range === 'latest') {
				// no steps necessary. GitHub sorts the releases for us automatically
			} else if (semver.validRange(range)) {
				versions = versions.filter((version) => {
					return semver.satisfies(version.version, range)
				})
				if (versions.length === 0) {
					reject(`Could not find a version that satisfies range ${range}`)
					return
				}
			} else {
				reject(`Provided range ${range} is not valid semver string`)
				return
			}

			let version = versions.shift().version
			let release = releases.find((release) => {
				return (semver.valid(release.tag_name)) ? semver.eq(version, release.tag_name) : false
			})
			resolve(release)
		})
	})
}
module.exports.getReleaseByVersion = getReleaseByVersion


/**
 * Tries to match an asset of a release for specific platform and arch.
 * Using `platform="", arch=""` behaves like a wildcard.
 * @param {Object} release - a GitHub release object
 * @param {string} platform [platform=os.platform()] - one of the supported platforms of os.platform
 * @param {string} arch [arch=os.arch()] - one of the supported architectures of os.arch
 * @returns {Promise<Object>}
 */
function getAssetByPlatformArch (release, platform=os.platform(), arch=os.arch()) {
	return new Promise((resolve, reject) => {
		let assets = release.assets
		if (arch === 'x64') {
			arch = '64' // this is named in various combinations, e.g amd64, linux64 and so on
		}

		assets = assets.filter((asset) => {
			return asset.name.includes(platform) && asset.name.includes(arch)
		})

		if (assets.length) {
			resolve(assets.pop())
		} else {
			reject(`An asset could not be found for platform ${platform} with arch ${arch}`)
		}
	})
}
module.exports.getAssetByPlatformArch = getAssetByPlatformArch


/**
 * Downloads a release asset from GitHub.
 * Calls the progress callback with the chunk length progressively. You can get the file size via @see getAssetByPlatformArch
 * @param {string} url
 * @param {string} name
 * @param {string} dir [directory=process.cwd()] - an optional download path
 * @param {function} [progress] - an optional callback to hook into with asset download
 * @returns {Promise<string>} - the path of the downloaded file
 */
function downloadAsset (url, name, dir=process.cwd(), progress=null) {
	return new Promise((resolve, reject) => {
		let fileStream = fs.createWriteStream(path.join(dir, name))
		let req = request.get(url)
		req.pipe(fileStream)

		if (typeof(progress) === 'function') {
			req.on('data', (chunk) => {
				progress(chunk.length)
			})
		} else if (progress !== null) {
			reject('Progress is not a valid callback')
		}

		req.on('error', (err) => {
			reject(`Failed to download file ${name} from url ${url} because of ${err}`)
		})

		req.on('end', () => {
			resolve(path.join(dir, name))
		})
	})
}
module.exports.downloadAsset = downloadAsset


/**
 * Tries to download given release by range for specified platform and arch.
 * If the architecture+platform cannot be matched the promise will be rejected.
 * @param {string} repo - the name of the GitHub name+repo, e.g fohlen/github-release-downloader
 * @param {string} range [range=latest] - semver range
 * @param {string} dir [directory=process.cwd()] - an optional download path
 * @param {string} platform [platform=os.platform()] - one of the supported platforms of os.platform
 * @param {string} arch [arch=os.arch()] - one of the supported architectures of os.arch
 * @returns {Promise<string>} - the path of the downloaded file
 */
function downloadAssetByPlatformArch (repo, range='latest', dir=process.cwd(), platform=os.platform(), arch=os.arch()) {
	module.exports.getReleaseByVersion(repo, range).then((release) => {
		module.exports.getAssetByPlatformArch(release, platform, arch).then((asset) => {
			module.exports.downloadAsset(asset.url, asset.name, dir)
		})
	})
}
module.exports.downloadAssetByPlatformArch = downloadAssetByPlatformArch
