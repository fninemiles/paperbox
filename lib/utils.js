
function summarizeMail (mail) {
  const mailSummary = (({ _id, from, to, priority, received, subject, date }) => {
    return { _id, from, to, priority, received, subject, date }
  })(mail)
  return mailSummary
}

function authorizeUser (auth, session, callback) {
  let err = null
  let result = null
  if (auth.username in this.options.users) {
    const { uid, password } = this.options.users[auth.username]
    if (auth.method === 'CRAM-MD5') {
      if (auth.validatePassword(password)) {
        result = { user: uid }
      }
    } else if (auth.method === 'PLAIN' || auth.method === 'LOGIN') {
      if (password === auth.password) {
        result = { user: uid }
      }
    }
  } else {
    result = { user: 65536 } // nobody
  }
  if (!result) {
    err = new Error('Invalid username or password')
  }
  callback(err, result)
}

module.exports = { summarizeMail, authorizeUser }
