const Paperbox = require('../index.js')
const server = new Paperbox({ db_type: 'nedb' })
server.listen()
