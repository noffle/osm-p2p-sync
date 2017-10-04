var fs = require('fs')
var sneakernet = require('hyperlog-sneakernet-replicator')
var mkdirp = require('mkdirp')
var eos = require('end-of-stream')
var Path = require('path')
var OsmP2P = require('osm-p2p')
var level = require('level')
var hyperlog = require('hyperlog')

module.exports = sync

function sync (a, b, cb) {
  getInfo(a, done.bind(null, 0))
  getInfo(b, done.bind(null, 1))

  var info = []
  var pending = 2
  function done (idx, err, details) {
    console.log(idx, details)
    info[idx] = details
    if (!--pending) {
      doSync(info[0], info[1], cb)
    }
  }
}

function doSync (a, b, cb) {
  if (a.type === 'dir' && b.type === 'dir') {
    return syncDirs(a.path, b.path, cb)
  }
  else if (a.type === 'dir' && b.type === 'file') {
    return syncFileDir(b.path, a.path, cb)
  }
  else if (a.type === 'file' && b.type === 'dir') {
    return syncFileDir(a.path, b.path, cb)
  }
  else if (a.type === 'file' && b.type === 'file') {
    return syncFiles(a.path, b.path, cb)
  }
}

function syncFiles (a, b) {
  throw new Error('not implemented')
}

function syncFileDir (a, b, cb) {
  var db = level(Path.join(b, 'log'))
  var hlog = hyperlog(db, { valueEncoding: 'json' })
  sneakernet(hlog, a, cb)
}

function syncDirs (a, b, cb) {
  var A = OsmP2P(a)
  var B = OsmP2P(b)
  var r1 = A.log.replicate()
  var r2 = B.log.replicate()

  eos(r1, done)
  eos(r2, done)

  r1.pipe(r2).pipe(r1)

  var pending = 2
  function done (err) {
    if (err) {
      pending = Infinity
      return cb(err)
    }
    if (!--pending) {
      return cb()
    }
  }
}

function getInfo (p, cb) {
  fs.stat(p, function (err, stat) {
    if (!stat) {
      if (p.endsWith('/')) {
        return cb(null, { path: p, type: 'dir', exists: false })
      } else {
        return cb(null, { path: p, type: 'file', exists: false })
      }
    } else {
      if (stat.isDirectory()) {
        return cb(null, { path: p, type: 'dir', exists: true })
      } else {
        return cb(null, { path: p, type: 'file', exists: true })
      }
    }
  })
}
