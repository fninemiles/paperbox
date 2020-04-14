const Taotie = require('../index.js')
const server = new Taotie({ db_type: 'nedb' })
server.listen()
