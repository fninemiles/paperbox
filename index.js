/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

const simpleParser = require('mailparser').simpleParser
const SMTPServer = require('smtp-server').SMTPServer

function Taotie (options) {
  this.options = {
    dbType: 'ldb',
    dbPath: 'data/mails.db',
    smtpPort: 1025,
    users: {
      guest: { password: 'password', user: 65535 },
      nobody: { password: null, user: 65536 }
    }
  }
  Object.assign(this.options, options)
  this.setMailStore()
}

Taotie.prototype.setMailStore = function () {
  const { dbType, dbPath } = this.options
  const DbClass = require(`./lib/mail_${dbType}.js`)
  this.mailstore = new DbClass(dbPath)
}

Taotie.prototype.listen = function () {
  const smtpOptions = {
    banner: 'mail server for testing',
    authOptional: true,
    authMethods: ['CRAM-MD5', 'PLAIN', 'LOGIN'],
    onData: processMailData.bind(this),
    onAuth: authorizeUser.bind(this),
    onRcptTo: validateRcptTo.bind(this),
    disabledCommands: ['STARTTLS']
  }
  const smtpServer = new SMTPServer(smtpOptions)
  smtpServer.listen(this.options.smtpPort)
  console.log('SMTP server listening at smtp://127.0.0.1:' + this.options.smtpPort + '/')
}

Taotie.prototype.addMTAFields = function (mail) {
  var now = new Date()
  mail.received = now
}

Taotie.prototype.onMailSaved = function (err, mailId) {
  if (err) {
    console.error('ERROR: failed saving mail:', err)
  } else {
    console.log('mail saved, id:', mailId)
  }
}

async function processMailData (stream, session, callback) {
  console.log('processMailData() - start')
  console.log('  session = ', session)
  var mboxes = session.envelope.rcptTo.map(function (x) { return x.address })
  const parsed = await simpleParser(stream)
  this.addMTAFields(parsed)
  for (var i = 0; i < mboxes.length; i++) {
    console.log('Save mail to mailbox [' + mboxes[i] + ']')
    this.mailstore.save_mail(mboxes[i], parsed, this.onMailSaved.bind(this))
  }
  callback()
  console.log('processMailData() - done')
}

function authorizeUser (auth, session, callback) {
  console.log('authorizeUser():')
  var err = null
  var result = null
  if (auth.username in this.options.users) {
    const { user, password } = this.options.users[auth.username]
    if (auth.method === 'CRAM-MD5') {
      if (auth.validatePassword(password)) {
        result = { user: user }
      }
    } else if (auth.method === 'PLAIN') {
      if (password === auth.password) {
        result = { user: user }
      }
    }
  } else {
    result = { user: 65536 } // nobody
  }
  if (!result) {
    err = new Error('Invalid username or password')
  }
  console.log(`err = ${err}`)
  console.log(result)
  callback(err, result)
}

function validateRcptTo (address, session, callback) {
  console.log(`validateRcptTo(${address}) ... OK`)
  callback()
}

module.exports = Taotie
