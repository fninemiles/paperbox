'use restrict'

/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const NeDB = require('nedb')
const utils = require('./utils')

module.exports = MailStoreNeDB

function MailStoreNeDB (path) {
  this.db_type = 'nedb'
  this._db = new NeDB({ filename: path + '.nedb', autoload: true })

  this.save_mail = function (mailbox, mail, callback) {
    var doc = Object.assign(mail, { type: 'mail', mailbox: mailbox })
    var db = this._db
    this.create_mailbox(mailbox, function (err, mbox) {
      if (err) {
        return callback(err)
      }
      db.insert(doc, function (err, newDoc) {
        if (err) {
          console.error('ERROR when insert doc into NeDB', err)
        }
        callback(err, newDoc._id)
      })
    })
  }

  this.create_mailbox = function (mailbox, callback) {
    var db = this._db
    db.find({ name: mailbox, type: 'mailbox' }, function (err, docs) {
      if (err) {
        console.error('ERROR when lookup for mailboxes')
        callback(err, null)
      } else if (docs.length > 0) {
        callback(null, docs)
      } else {
        db.update(
          { name: mailbox, type: 'mailbox' },
          { name: mailbox, type: 'mailbox' },
          { upsert: true },
          function (err, numReplaced) {
            if (err) {
              callback(err, null)
            } else if (numReplaced === 1) {
              callback(null, numReplaced)
            } else {
              console.warn(`Found ${numReplaced} mailboxes with name: ${mailbox}, please clean up DB`)
              callback(null, numReplaced)
            }
          }
        )
      }
    })
  }

  this.list_mails = function (mailbox, callback) {
    this._db.find({ mailbox: mailbox }, function (err, docs) {
      const summarized = docs.map((m) => utils.summarizeMail(m))
      return callback(err, summarized)
    })
  }

  this.count_mails = function (mailbox, callback) {
    this._db.count({ mailbox: mailbox }, function (err, count) {
      return callback(err, count)
    })
  }

  this.mailboxes = function (callback) {
    this._db.find({ type: 'mailbox' }, function (err, docs) {
      callback(err, docs.map(function (doc) { return { name: doc.name } }))
    })
  }

  this.getmail = function (mailbox, mailId, callback) {
    this._db.find({ _id: mailId }, function (err, docs) {
      if (err) {
        callback(err)
      } else if (docs.length === 0) {
        callback(Error('bad mail id: ' + mailId))
      } else if (docs.length > 1) {
        callback(Error('more than 1 mail matches id: ' + mailId))
      } else {
        callback(err, docs[0])
      }
    })
  }

  this.delete = function (mailbox, mailId, callback) {
    this._db.remove({ _id: mailId }, {}, function (err, numRemoved) {
      if (err) {
        callback(err)
      } else {
        callback(null, numRemoved)
      }
    })
  }
}
