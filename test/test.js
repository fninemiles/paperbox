/* eslint-env mocha */

const assert = require('assert')
const MailStoreLDB = require('../lib/mail_ldb.js')
const MailStoreSQLite3 = require('../lib/mail_sqlite3')

function makeTests (db) {
  describe('Mail Store with ' + db.db_type, function () {
    const mailDb = db
    const date = new Date()
    const mail = {
      subject: 'Mail subject for unit test',
      from: 'someone@senders.com',
      to: ['recever1@receivers.com', 'receiver2@receivers.com'],
      date: date.toUTCString(),
      priority: 'normal',
      text: 'mail body, mail body'
    }

    describe('#save_mail()', function () {
      it('save mail to single mailbox without error', function (done) {
        const mailbox = 'mailbox1@mail.com'
        mailDb.save_mail(mailbox, mail, function (err, mailId) {
          // console.log('err=', err)
          // console.log('mailId=', mailId)
          assert(!err)
          assert(mailId != null, 'mailId should not be null')
          assert(typeof mailId === 'string', 'mail id should be string')
          mailDb.getmail(mailbox, mailId, function (err, savedMail) {
            // console.log('saved mails:', savedMail)
            assert(savedMail.subject === mail.subject)
            assert(mailId != null)
            done(err)
          })
        })
      })

      it('save mail to multiple mailbox without error', function (done) {
        const mailboxes = ['mailbox2@mail.com', 'mailbox3@mail.com']
        mailDb.save_mail(mailboxes, mail, function (err, mailId) {
          // console.log('err=', err)
          // console.log('mailId=', mailId)
          assert(!err)
          assert(mailId != null, 'mailId should not be null')
          assert(mailId instanceof Array, 'mail id should be Array')
          mailDb.getmail(mailboxes[1], mailId[1], function (err, savedMail) {
            // console.log('saved mails:', savedMail)
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
          // console.log('err=', err, 'count=', count)
          assert(!err)
          assert(count > 0)
          done()
        })
      })
    })

    describe('#list_mails()', function () {
      it('should list 0 mails for mailbox null', function (done) {
        mailDb.list_mails(null, (err, mails) => {
          done()
          assert(!err)
          assert(Array.isArray(mails))
          assert(mails.length === 0)
        })
      })

      it('should list mails for specific mailbox', function (done) {
        mailDb.list_mails('mailbox1@mail.com', function (err, mails) {
          assert(!err)
          assert(mails.length > 0)
          assert(mails[0]._id)
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
        const mailbox = 'mailbox1@mail.com'
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
makeTests(new MailStoreSQLite3(':memory:'))
