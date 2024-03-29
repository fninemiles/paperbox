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
}

MailStoreLDB.prototype.save_single_mail = function (mailbox, mail, callback) {
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

MailStoreLDB.prototype.save_mail = function (saveTo, mail, callback) {
  if (typeof saveTo === 'string') {
    return this.save_single_mail(saveTo, mail, callback)
  }
  const mboxes = saveTo
  const mailIDs = []
  const errors = []
  let count = 0

  function handleCallbacks (err, mid) {
    if (err) {
      errors.push(err)
    } else {
      mailIDs.push(mid)
    }
    count++
    if (count >= mboxes.length) {
      summarizeAndCallback(saveTo, errors, mailIDs, callback)
    }
  }

  for (const mbox of mboxes) {
    this.save_single_mail(mbox, mail, handleCallbacks)
  }
}

function summarizeAndCallback (saveTo, errors, mailIDs, callback) {
  if (typeof mailbox === 'string') {
    if (errors.length > 0) {
      callback(errors[0])
    } else {
      callback(null, mailIDs[0])
    }
  } else {
    if (errors.length > 0) {
      const err = new Error(errors.join('. '))
      callback(err)
    } else {
      callback(null, mailIDs)
    }
  }
}

MailStoreLDB.prototype.count_mails = function (mailbox, callback) {
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

MailStoreLDB.prototype.list_mails = function (mailbox, callback) {
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

MailStoreLDB.prototype.mailboxes = function (callback) {
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

MailStoreLDB.prototype.getmail = function (mailbox, mailId, callback) {
  this._db.get(mailKey(mailbox, mailId), function (err, data) {
    callback(err, data)
  })
}

MailStoreLDB.prototype.delete = function (mailbox, mailId, callback) {
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

module.exports = MailStoreLDB
