/* eslint-env mocha */

var assert = require('assert')
var MailStoreLDB = require('../lib/mail_ldb.js')
var MailStoreNeDB = require('../lib/mail_nedb.js')

function makeTests (db) {
  describe('Mail Store with ' + db.db_type, function () {
    var mailDb = db
    var date = new Date()
    var mail = {
      subject: 'Mail subject for unit test',
      from: 'someone@senders.com',
      to: ['recever1@receivers.com', 'receiver2@receivers.com'],
      date: date.toUTCString(),
      priority: 'normal',
      text: 'mail body, mail body'
    }

    describe('#save_mail()', function () {
      it('should save without error', function (done) {
        var mailbox = 'mailbox1@mail.com'
        mailDb.save_mail(mailbox, mail, function (err, mailId) {
          assert(!err)
          assert(mailId != null, 'mailId should not be null')
          assert(typeof (mailId) === 'string', 'mail id should be string')
          mailDb.getmail(mailbox, mailId, function (err, savedMail) {
            assert(savedMail.subject === mail.subject)
            assert(mailId != null)
            done(err)
          })
        })
      })
    })

    describe('#count_mails()', function () {
      it('should return the number of mails in give mail box', function (done) {
        mailDb.count_mails('mailbox1@mail.com', function (err, count) {
          assert(!err)
          assert(count > 0)
          done()
        })
      })
    })

    describe('#list_mails()', function () {
      it('should list mails for all mailboxes', function (done) {
        mailDb.list_mails(null, done)
      })
      it('should list mails for specific mailbox', function (done) {
        mailDb.list_mails('mailbox1@mail.com', function (err, mails) {
          assert(!err)
          assert(mails.length > 0)
          done()
        })
      })
    })

    describe('#mailboxes()', function () {
      it('should list mail boxes', function (done) {
        mailDb.mailboxes(function (err, boxes) {
          assert(boxes != null, 'result should not be null')
          assert(boxes[0].name === 'mailbox1@mail.com')
          done(err)
        })
      })
    })

    describe('#getmail()', function () {
      it('returns error if invalid mail id is given', function (done) {
        mailDb.getmail('badbox', 'BAD-BAD-ID', function (err, value) {
          assert(err)
          assert.strictEqual(value, undefined)
          done()
        })
      })
    })

    describe('#delete()', function () {
      it('returns no err if delete non-exist mail', function (done) {
        mailDb.delete('badbox', 'bad-mail-id', function (err) {
          done(err)
        })
      })

      it('deletes mail by id', function (done) {
        var mailbox = 'mailbox1@mail.com'
        mailDb.save_mail(mailbox, mail, function (err, mailId) {
          assert(!err)
          assert(mailId)
          mailDb.delete(mailbox, mailId, function (err) {
            done(err)
          })
        })
      })
    })
  })
}

makeTests(new MailStoreLDB('data/test'))
makeTests(new MailStoreNeDB('data/test'))
