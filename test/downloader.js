const assert = require('assert')
const process = require('process')
const os = require('os')
const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const sinon = require('sinon')
const request = require('request')
const rp = require('request-promise-native')
const dgraphReleases = require('./dgraph.json')
const releaseDownloader = require('../downloader')

describe('getReleaseList', () => {
	it('should retrieve a list of releases from GitHub, given a specific repo has releases', function(done) {
		sinon.stub(rp, 'get').withArgs({
			uri: 'https://api.github.com/repos/dgraph-io/dgraph/releases',
			headers: {
				'User-Agent': 'Github-Release-Downloader'
			},
			json: true
		}).resolves(dgraphReleases)

		releaseDownloader.getReleaseList('dgraph-io/dgraph').then((versions) => {
			assert.ok(versions.length)
			done()
		})
	})

	it('should return an empty list when a repo has no releases', function(done) {
		sinon.stub(rp, 'get').withArgs({
			uri: 'https://api.github.com/repos/Fohlen/Simulant/releases',
			headers: {
				'User-Agent': 'Github-Release-Downloader'
			},
			json: true
		}).resolves([])

		releaseDownloader.getReleaseList('Fohlen/Simulant').then((versions) => {
			assert.deepEqual(versions, [])
			done()
		}).catch((err) => {
			done(err)
		})
	})

	afterEach(() => {
		rp.get.restore()
	})
})

describe('getReleaseByVersion', () => {
	beforeEach(() => {
		sinon.stub(releaseDownloader, 'getReleaseList').resolves(dgraphReleases)
	})

	it('should return the latest version by default', function(done) {
		releaseDownloader.getReleaseByVersion('dgraph-io/dgraph').then((release) => {
			expect(release).to.have.property('name')
			expect(release).to.have.property('created_at')
			expect(release).to.have.property('published_at')
			done()
		})
	})

	it('should return a match based on semver', function(done) {
		releaseDownloader.getReleaseByVersion('dgraph-io/dgraph', '^1.0').then((release) => {
			expect(release).to.have.property('name')
			expect(release).to.have.property('created_at')
			expect(release).to.have.property('published_at')
			done()
		})
	})

	it('should reject on an invalid semver', function(done) {
		releaseDownloader.getReleaseByVersion('dgraph-io/dgraph', 'abc').catch((err) => {
			assert.equal(err, 'Provided range abc is not valid semver string')
			done()
		})
	})

	it('should reject if no valid version can be found', function (done) {
		releaseDownloader.getReleaseByVersion('dgraph-io/dgraph', '^7.0').catch((err) => {
			assert.equal(err, 'Could not find a version that satisfies range ^7.0')
			done()
		})
	})

	afterEach(() => {
		releaseDownloader.getReleaseList.restore()
	})
})

describe('getAssetByPlatformArch', () => {
	let release // needed for tests
	beforeEach(() => {
		release = dgraphReleases[0]
	})

	it('should return the correct asset for the platform', function (done) {
		sinon.stub(os, 'arch').returns('x64')
		sinon.stub(os, 'platform').returns('linux')

		releaseDownloader.getAssetByPlatformArch(release).then((asset) => {
			expect(asset).to.have.property('url')
			expect(asset).to.have.property('name')
			expect(asset).to.have.property('content_type')
			expect(asset).to.have.property('size')
			done()
		})
	})

	it('should reject if no asset for an arch is found', function (done) {
		sinon.stub(os, 'arch').returns('s390x')
		sinon.stub(os, 'platform').returns('aix')
		releaseDownloader.getAssetByPlatformArch(release).catch((err) => {
			assert.equal(err, 'An asset could not be found for platform aix with arch s390x')
			done()
		})
	})

	afterEach(() => {
		os.arch.restore()
		os.platform.restore()
	})
})

describe('downloadAsset', () => {
	beforeEach(() => {
		sinon.stub(process, 'cwd').returns(os.tmpdir())
		let mockStream = fs.createReadStream(path.join(__dirname, 'testfile.txt')) // eslint-disable-line no-undef
		sinon.stub(request, 'get').returns(mockStream)
	})

	it('should return the path after downloading', function(done) {
		releaseDownloader.downloadAsset('http://some.file/testfile.txt', 'testfile.txt').then((downloaded) => {
			assert.equal(downloaded, path.join(os.tmpdir(), 'testfile.txt'))
			assert.ok(fs.existsSync(path.join(os.tmpdir(), 'testfile.txt')))
			done()
		})
	})

	it('should save the file in a custom dir and return the path after downloading', function (done) {
		releaseDownloader.downloadAsset('http://some.file/testfile.txt', 'testfile.txt', os.homedir()).then((downloaded) => {
			assert.equal(downloaded, path.join(os.homedir(), 'testfile.txt'))
			assert.ok(fs.existsSync(path.join(os.homedir(), 'testfile.txt')))
			done()
		})
	})

	afterEach(() => {
		process.cwd.restore()
		request.get.restore()
	})
})

describe('progress', () => {
    beforeEach(() => {
        let mockStream = fs.createReadStream(path.join(__dirname, 'testfile.txt')) // eslint-disable-line no-undef
        sinon.stub(request, 'get').returns(mockStream)
    })

    it('should download a file with a progress bar', function(done) {
        let downloadCallback = sinon.spy()
        releaseDownloader.downloadAsset('http://some.file/testfile.txt', 'testfile.txt', os.tmpdir(), downloadCallback).then((downloaded) => {
            assert.equal(downloaded, path.join(os.tmpdir(), 'testfile.txt'))
            expect(downloadCallback.callCount).to.be.at.least(1)
            done()
        })
    })

    afterEach(() => {
        request.get.restore()
    })
})
