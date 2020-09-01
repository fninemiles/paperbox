/* eslint-env mocha */

const assert = require('assert')
const utils = require('../lib/utils.js')

describe('utils', () => {
  describe('#summarizeMail()', () => {
    const mail = {
      _id: '0001',
      subject: 'test subject',
      from: 'userA@example.com',
      to: ['userB@example.com'],
      htlm: 'this is html body',
      text: 'this is text body',
      received: new Date(),
      priority: 1,
      date: new Date()
    }
    it('picks up certain fields from mail', (done) => {
      const expectedProps = ['_id', 'from', 'to', 'priority', 'received', 'subject', 'date']
      const summarized = utils.summarizeMail(mail)
      for (var i = 0; i < expectedProps.length; i++) {
        assert(expectedProps[i] in summarized,
          `missing properties "${expectedProps[i]}"`)
      }
      done()
    })
  })

  describe('#authorizeUser()', () => {
    const auth = {
      method: 'PLAIN',
      username: 'guest',
      password: 'password',
      validatePassword: () => { return true }
    }
    const session = null
    const server = {
      options: {
        logger: console,
        users: {
          guest: {uid: 60000, password: 'password' }
        }
      }
    }

    it('handles PLAIN auth of user guest', (done) => {
      auth.method = 'PLAIN'
      const authorizeUser = utils.authorizeUser.bind(server)
      authorizeUser(auth, null, (err, result) => {
        assert(result.user === 60000)
      })
      done()
    })
      
    it('handles CRAM-MD5 auth of user guest', (done) => {
      auth.method = 'CRAM-MD5'
      const authorizeUser = utils.authorizeUser.bind(server)
      authorizeUser(auth, null, (err, result) => {
        assert(result.user === 60000)
      })
      done()
    })

    it('handles LOGIN auth of user guest', (done) => {
      auth.method = 'LOGIN'
      const authorizeUser = utils.authorizeUser.bind(server)
      authorizeUser(auth, null, (err, result) => {
        assert(result.user === 60000)
      })
      done()
    })
  })
})
