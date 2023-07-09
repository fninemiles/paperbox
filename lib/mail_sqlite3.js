const sqlite3 = require('better-sqlite3')

function MailStore (dbPath) {
  this.db_type = 'sqlite3'
  this._db = sqlite3(dbPath, {})
  this._db.pragma('journal_mode = WAL')
  this.migrate()
}

MailStore.prototype.migrate = function () {
  const db = this._db
  const stmts = [
    db.prepare(`CREATE TABLE IF NOT EXISTS mails (
      id INTEGER PRIMARY KEY,
      mail_id TEXT,
      data TEXT NOT NULL,
      table_constraints
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS mailboxes (
      email TEXT NOT NULL,
      mail_id INTEGER NOT NULL,
      is_read INTEGER DEFAULT 0,
      table_constraints)`),
  ]
  db.transaction(() => {
    for (const s of stmts) s.run()
  })()
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_mailboxes ON mailboxes (email)`).run()
}

MailStore.prototype.save_mail = function (mailbox, mail, callback) {
  try {
    const insertMail = this._db.prepare(
      `INSERT INTO mails ( data ) VALUES ( ? )`
    )
    const insertRcpt = this._db.prepare(
      `INSERT INTO mailboxes (email, mail_id) VALUES (?, ?)`
    )
    let receptRowid
    const trx = this._db.transaction((mailbox, mail) => {
      const m = insertMail.run(JSON.stringify(mail))
      // console.log('## result of insert mails is: ', m)
      const r = insertRcpt.run(mailbox, m.lastInsertRowid)
      // console.log('## result of insert recepts is: ', r)
      receptRowid = r.lastInsertRowid
    })
    const tr = trx(mailbox, mail)
    callback(null, `${receptRowid}`)
  } catch(e) {
    // console.error('caught:', e)
    callback(e, null)
  }
}

MailStore.prototype.list_mails = function (mailbox, callback) {
  try {
    const stmt = this._db.prepare(
      `SELECT mailboxes.email, mailboxes.mail_id, mails.data FROM mailboxes JOIN mails
      ON mailboxes.mail_id = mails.id
      WHERE mailboxes.email = ? `)
    const result = stmt.all(mailbox)
    // console.log('## list_mails, result: ', result)
    const mails = result.map(r => {
      const mail = JSON.parse(r.data)
      mail._id = r.mail_id
      return mail
    })
    // console.log('## mails: ', mails)
    callback(null, mails)
  } catch (e) {
    callback(e, null)
  }
}

MailStore.prototype.count_mails = function (mailbox, callback) {
  try {
    const count = this._db.prepare('SELECT COUNT(mail_id) FROM mailboxes WHERE email = ?')
    const result = count.get(mailbox)
    callback(null, result['COUNT(mail_id)'])
  } catch (e) {
    callback(e, undefined)
  }
}

MailStore.prototype.mailboxes = function (callback) {
  try {
    const stmt = this._db.prepare(`SELECT DISTINCT email from mailboxes`)
    const result = stmt.all()
    // console.log('## mailboxes(), stmt.all() -> ', result)
    const mboxes = result.map(({ email: name }) => ({ name }))
    callback(null, mboxes)
  } catch (e) {
    callback(e)
  }
}

MailStore.prototype.getmail = function (mailbox, mailid, callback) {
  try {
    const stmt = this._db.prepare(
      `SELECT * FROM mails where id = ? LIMIT 1`
    )
    const result = stmt.get(mailid)
    // console.log('## getmail() result is: ', result)
    if (result === undefined) {
      throw new Error('Bad mail id')
    }
    callback(null, JSON.parse(result.data))
  } catch (e) {
    callback(e, undefined)
  }
}

MailStore.prototype.delete = function (mailbox, mailId, callback) {
  try {
    const stmt = this._db.prepare(
      `DELETE FROM mailboxes WHERE email = ? and mail_id = ?`
    )
    const result = stmt.run(mailbox, mailId)
    // console.log('#delete(), stmt.run() -> ', result, 'mailId=', mailId)
    const deleted = result.changes === 1
    callback(null, deleted)
  } catch (e) {
    callback(e)
  }
}

module.exports = MailStore
