import * as SUT from './siwt.utils'

describe('utils/siwt.utils', () => {
  describe('constructSignPayload', () => {
    it('should create the Beacon SignPayload as expected', () => {
      // when ... we want to construct the Beacon SignPayload
      // then ... it should format it using Micheline Signingtype as expected
      const payload = 'PAYLOAD'
      const pkh = 'PKH'
      const expected = {
        signingType: 'micheline',
        payload,
        sourceAddress: pkh,
      }
      const result = SUT.constructSignPayload({ payload, pkh })

      expect(result).toEqual(expected)
    })
  })

  describe('createMessagePayload', () => {
    it('should create the message payload as expected', () => {
      // when ... we want to create the message payload
      // then ... it should create it as expected
      const messageData = {
        dappUrl: 'DAPP URL',
        timestamp: 'TIMESTAMP',
        message: 'MESSAGE',
      }
      const expected =
        '05010000006054657a6f73205369676e6564204d6573736167653a20444150502055524c2054494d455354414d50204d455353414745'
      const result = SUT.packMessagePayload(messageData)

      expect(result).toEqual(expected)
    })
  })
})
