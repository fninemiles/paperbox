/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

const simpleParser = require('mailparser').simpleParser
const SMTPServer = require('smtp-server').SMTPServer
const bunyan = require('bunyan')

function Paperbox (options) {
  this.options = {
    dbType: 'ldb',
    dbPath: 'data/mails.db',
    smtpPort: 1025,
    logger: bunyan.createLogger({name: "paperbox", level: "debug"}),
    users: {
      guest: { password: 'password', user: 65535 },
      nobody: { password: null, user: 65536 }
    }
  }
  Object.assign(this.options, options)
  this.setMailStore()
}

Paperbox.prototype.setMailStore = function () {
  const { dbType, dbPath } = this.options
  const DbClass = require(`./lib/mail_${dbType}.js`)
  this.mailstore = new DbClass(dbPath)
}

Paperbox.prototype.listen = function () {
  const smtpOptions = {
    banner: 'mail server for testing',
    authOptional: true,
    maxAllowedUnauthenticatedCommands: 100,
    logger: this.options.logger,
    authMethods: ['CRAM-MD5', 'PLAIN', 'LOGIN'],
    onData: processMailData.bind(this),
    onAuth: authorizeUser.bind(this),
    onRcptTo: validateRcptTo.bind(this),
    disabledCommands: ['STARTTLS']
  }
  const smtpServer = new SMTPServer(smtpOptions)
  smtpServer.listen(this.options.smtpPort)
  this.options.logger.info('server started ... ')
}

Paperbox.prototype.addMTAFields = function (mail) {
  var now = new Date()
  mail.received = now
}

Paperbox.prototype.onMailSaved = function (err, mailId) {
  if (err) {
    this.options.logger.error('ERROR: failed saving mail:', err)
  } else {
    this.options.logger.debug('mail saved, id:', mailId)
  }
}

async function processMailData (stream, session, callback) {
  this.options.logger.debug('processMailData() - start')
  this.options.logger.debug('  session = ', session)
  var mboxes = session.envelope.rcptTo.map(function (x) { return x.address })
  const parsed = await simpleParser(stream)
  this.addMTAFields(parsed)
  for (var i = 0; i < mboxes.length; i++) {
    this.options.logger.info('save mail to [' + mboxes[i] + ']')
    this.mailstore.save_mail(mboxes[i], parsed, this.onMailSaved.bind(this))
  }
  callback()
  this.options.logger.debug('processMailData() - done')
}

function authorizeUser (auth, session, callback) {
  this.options.logger.debug('authorizeUser():')
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
  this.options.logger.debug(`err = ${err}, result=${result}`)
  callback(err, result)
}

function validateRcptTo (address, session, callback) {
  this.options.logger.debug(`validateRcptTo(${address.address}, ${address.args}) ... OK`)
  callback()
}

module.exports = Paperbox
