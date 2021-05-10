/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

const fs = require('fs')
const simpleParser = require('mailparser').simpleParser
const SMTPServer = require('smtp-server').SMTPServer
const bunyan = require('bunyan')
const utils = require('./lib/utils')

function Paperbox (options) {
  this.options = {
    dbType: 'ldb',
    dbPath: 'data/mails.db',
    smtpPort: 1025,
    smtpPortTLS: 1465,
    tlsKey: 'data/key.pem',
    tlsCert: 'data/cert.pem',
    logger: bunyan.createLogger({name: "paperbox", level: "debug"}),
    users: {
      guest: { password: 'password', uid: 65535 },
      nobody: { password: null, uid: 65536 }
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
  const defaults = {
    banner: 'mail server for testing',
    authOptional: true,
    maxAllowedUnauthenticatedCommands: 100,
    logger: this.options.logger,
    authMethods: ['CRAM-MD5', 'PLAIN', 'LOGIN'],
    onData: processMailData.bind(this),
    onAuth: utils.authorizeUser.bind(this),
    onRcptTo: validateRcptTo.bind(this),
  }
  try {
    fs.accessSync(this.options.tlsKey, fs.constants.F_OK | fs.constants.R_OK)
    this.options.logger.info('Loading SSL key from:', this.options.tlsKey)
    defaults.key = fs.readFileSync(this.options.tlsKey)
  } catch (err) {
    this.options.logger.error('Error, unable to access file: %s', this.options.tlsKey)
  }
  try {
    fs.accessSync(this.options.tlsCert, fs.constants.F_OK | fs.constants.R_OK)
    this.options.logger.info('Loading SSL cert from:', this.options.tlsCert)
    defaults.cert = fs.readFileSync(this.options.tlsCert)
  } catch (err) {
    this.options.logger.error('Error, unable to access file: %s', this.options.tlsCert)
  }
  if (this.options.smtpPort) {
    let smtpOpts = Object.assign({}, defaults, {})
    let server = new SMTPServer(smtpOpts)
    server.on('error', handleError.bind(this))
    server.listen(this.options.smtpPort)
  }
  if (this.options.smtpPortTLS) {
    let smtpOpts = Object.assign({}, defaults, {secure: true})
    let server = new SMTPServer(smtpOpts)
    server.on('error', handleError.bind(this))
    server.listen(this.options.smtpPortTLS)
  }
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

function validateRcptTo (address, session, callback) {
  this.options.logger.debug(`validateRcptTo(${address.address}, ${address.args}) ... OK`)
  callback()
}

function handleError(err) {
  this.options.logger.error('Error %s', err.message)
}

module.exports = Paperbox
