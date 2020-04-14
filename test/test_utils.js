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
})
