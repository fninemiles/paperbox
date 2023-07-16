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
      messageId TEXT,
      data BLOB NOT NULL,
      ref_count INTEGER DEFAULT 0,
      table_constraints
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS mailboxes (
      email TEXT NOT NULL,
      mail_id INTEGER NOT NULL,
      is_read INTEGER DEFAULT 0,
      table_constraints)`)
  ]
  db.transaction(() => {
    for (const s of stmts) s.run()
  })()
  db.prepare('CREATE INDEX IF NOT EXISTS idx_mailboxes ON mailboxes (email)').run()
}

MailStore.prototype.save_mail = function (saveTo, mail, callback) {
  try {
    const insertMail = this._db.prepare(
      'INSERT INTO mails ( data, ref_count ) VALUES ( ?, ? )'
    )
    const insertRcpt = this._db.prepare(
      'INSERT INTO mailboxes (email, mail_id) VALUES (?, ? )'
    )
    let mailid
    let mboxes
    if (saveTo instanceof Array) {
      mboxes = saveTo
    } else if (typeof saveTo === 'string') {
      mboxes = [saveTo]
    } else {
      throw new Error('saveTo must be a string or array: ', saveTo)
    }
    const trxSave = this._db.transaction((mailboxes, mail) => {
      const m = insertMail.run(Buffer.from(JSON.stringify(mail)), mboxes.length)
      console.log('## result of insert mails is: ', m)
      mailid = m.lastInsertRowid
      for (const mb of mailboxes) {
        insertRcpt.run(mb, m.lastInsertRowid)
      }
    })
    trxSave(mboxes, mail)
    if (typeof saveTo === 'string') {
      callback(null, mailid.toString())
    } else {
      callback(null, mboxes.map(x => mailid.toString()))
    }
  } catch (e) {
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
    const stmt = this._db.prepare('SELECT DISTINCT email from mailboxes')
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
      'SELECT * FROM mails where id = ? LIMIT 1'
    )
    const result = stmt.get(mailid)
    // console.log('## getmail() result is: ', result)
    if (result === undefined) {
      throw new Error('Bad mail id')
    }
    callback(null, JSON.parse(result.data.toString()))
  } catch (e) {
    callback(e, undefined)
  }
}

MailStore.prototype.delete = function (mailbox, mailId, callback) {
  try {
    const stmt = this._db.prepare(
      'DELETE FROM mailboxes WHERE email = ? and mail_id = ?'
    )
    const updateRef = this._db.prepare(
      'UPDATE mails set ref_count = ref_count - 1 where id = ?'
    )
    const purge = this._db.prepare(
      'DELETE FROM mails WHERE ref_count = 0'
    )
    const result = stmt.run(mailbox, mailId)
    // console.log('#delete(), stmt.run() -> ', result, 'mailId=', mailId)
    const deleted = result.changes === 1
    updateRef.run(mailId)
    purge.run()
    callback(null, deleted)
  } catch (e) {
    callback(e)
  }
}

module.exports = MailStore
