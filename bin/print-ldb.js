/* eslint-disable no-console */
const level = require('level')

if (process.argv.length !== 3) {
  console.log('Syntax: node print-ldb.js /path/to/db')
}

const dbPath = process.argv[2]
const db = level(dbPath)

db.createKeyStream().on('data', function (key) {
  db.get(key, function (err, value) {
    if (err) {
      console.err('There is an Error:', err)
      return
    }
    console.log('=====================')
    console.log(key)
    console.log('---------------------')
    console.log('Value-Type:' + typeof (value))
    console.log('Value:' + value)
    if (value[0] && value[0].from) {
      console.log('  from:' + value.from)
      console.log('  to:' + value.to)
      console.log('  subject:' + value.subject)
    }
    console.log('=====================\n')
  })
})
