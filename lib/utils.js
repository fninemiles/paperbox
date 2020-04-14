
function summarizeMail (mail) {
  const mailSummary = (({ _id, from, to, priority, received, subject, date }) => {
    return { _id, from, to, priority, received, subject, date }
  })(mail)
  return mailSummary
}

module.exports = { summarizeMail }
