'use strict'

/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const utils = require('./utils')

var path = require('path')
var fs = require('fs')
var level = require('level')

function mailKey (mailbox, mailId) {
  return 'MBOX~' + mailbox + '~data~' + mailId
}

function mailCounterKey (mailbox) {
  return 'MBOX_COUNT~' + mailbox
}

/**
 */
function MailStoreLDB (dbPath) {
  var dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  this.db_type = 'leveldb'
  this._db = level(dbPath + '.ldb', { valueEncoding: 'json' })

  this.save_mail = function (mailbox, mail, callback) {
    var db = this._db
    this.count_mails(mailbox, function (err, n) {
      if (err) {
        return callback(err, null)
      }
      n++
      var mailId = Date.now().toString()
      var ops = [
        { type: 'put', key: mailCounterKey(mailbox), value: n },
        { type: 'put', key: mailKey(mailbox, mailId), value: mail }
      ]
      db.batch(ops, function (err) {
        if (err) {
          console.error('Failed save mail...', err)
        }
        callback(err, mailId)
      })
    })
  }

  this.count_mails = function (mailbox, callback) {
    var db = this._db
    db.get(mailCounterKey(mailbox), function (err, value) {
      var n = 0
      if (err) {
        if (err.notFound) {
          n = 0
        } else {
          return callback(err, 0)
        }
      } else {
        n = value
      }
      callback(null, n)
    })
  }

  this.list_mails = function (mailbox, callback) {
    var mails = []
    var err = null
    var db = this._db
    var keyPrefix = mailKey(mailbox, '')
    db.createReadStream({ start: keyPrefix, lt: keyPrefix + '\xff' })
      .on('data', function (data) {
        const mailId = data.key.substring(keyPrefix.length)
        mails.push(Object.assign({}, utils.summarizeMail(data.value), { _id: mailId }))
      })
      .on('error', function (streamErr) {
        err = streamErr
      })
      .on('end', function () {
        callback(err, mails)
      })
  }

  this.mailboxes = function (callback) {
    var err = null
    var keyPrefix = mailCounterKey('')
    var mailboxes = []
    var db = this._db
    db.createReadStream({ gt: keyPrefix, lt: keyPrefix + '\xff' })
      .on('data', function (data) {
        var name = data.key.substring(keyPrefix.length)
        mailboxes.push({ name: name })
      })
      .on('error', function (streamErr) {
        err = streamErr
      })
      .on('end', function () {
        callback(err, mailboxes)
      })
  }

  this.getmail = function (mailbox, mailId, callback) {
    this._db.get(mailKey(mailbox, mailId), function (err, data) {
      callback(err, data)
    })
  }

  this.delete = function (mailbox, mailId, callback) {
    this._db.del(mailKey(mailbox, mailId), function (err) {
      var numDeleted = 0
      if (err) {
        console.error('ERROR when delete mail ' + mailbox + ', ' + mailId + err)
      } else {
        numDeleted = 1
      }
      callback(err, numDeleted)
    })
  }
}

module.exports = MailStoreLDB
