'use strict'

/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const utils = require('./utils')

const path = require('path')
const fs = require('fs')
const { Level } = require('level')

function mailKey (mailbox, mailId) {
  return 'MBOX~' + mailbox + '~data~' + mailId
}

function mailCounterKey (mailbox) {
  return 'MBOX_COUNT~' + mailbox
}

/**
 */
function MailStoreLDB (dbPath) {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  this.db_type = 'leveldb'
  this._db = new Level(dbPath + '.ldb', { valueEncoding: 'json' })

  this.save_mail = function (mailbox, mail, callback) {
    const db = this._db
    this.count_mails(mailbox, function (err, n) {
      if (err) {
        return callback(err, null)
      }
      n++
      const mailId = Date.now().toString()
      const ops = [
        { type: 'put', key: mailCounterKey(mailbox), value: n },
        { type: 'put', key: mailKey(mailbox, mailId), value: mail }
      ]
      db.batch(ops, (dberr) => {
        if (dberr) {
          console.error('Failed save mail...', dberr)
        }
        callback(err, mailId)
      })
    })
  }

  this.count_mails = function (mailbox, callback) {
    const db = this._db
    db.get(mailCounterKey(mailbox), function (err, value) {
      let n = 0
      if (err) {
        if (!err.notFound) {
          return callback(err, 0)
        }
      } else {
        n = value
      }
      callback(null, n)
    })
  }

  this.list_mails = function (mailbox, callback) {
    const db = this._db
    const keyPrefix = mailKey(mailbox, '')
    db.iterator({ gt: keyPrefix, lt: keyPrefix + '\xff' })
      .all()
      .then(entries => {
        const mails = entries.map(([key, value]) => {
          const id = key.substring(keyPrefix.length)
          const mail = utils.summarizeMail(value)
          return { ...mail, _id: id }
        })
        callback(null, mails)
      })
      .catch(err => {
        callback(err, null)
      })
  }

  this.mailboxes = function (callback) {
    const keyPrefix = mailCounterKey('')
    const db = this._db
    db.keys({ gt: keyPrefix, lt: keyPrefix + '\xff' })
      .all()
      .then(keys => {
        const mboxes = keys.map(k => ({ name: k.substring(keyPrefix.length) }))
        callback(null, mboxes)
      })
      .catch(err => {
        console.error(err)
        callback(err, [])
      })
  }

  this.getmail = function (mailbox, mailId, callback) {
    this._db.get(mailKey(mailbox, mailId), function (err, data) {
      callback(err, data)
    })
  }

  this.delete = function (mailbox, mailId, callback) {
    this._db.del(mailKey(mailbox, mailId), function (err) {
      let numDeleted = 0
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
