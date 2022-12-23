import { validPkh } from '../fixtures'
import { Network } from '../types'
import * as SUT from './data'

describe('./data', () => {
  describe('getLedgerFromStorage', () => {
    it.each([
      [
        {
          data: [
            {
              id: 'ID',
              key: 'KEY',
              value: 'VALUE',
            },
          ],
        },
        [
          {
            key: 'KEY',
            value: 'VALUE',
          },
        ],
      ],
      [
        {
          data: [
            {
              id: 'ID',
              key: {
                nat: 'NAT',
                value: 'VALUE',
              },
              value: 'VALUE',
            },
          ],
        },
        [
          {
            key: {
              nat: 'NAT',
              value: 'VALUE',
            },
            value: 'VALUE',
          },
        ],
      ],
    ])('should get the ledger data from the storage of a contract', async (storage, expected) => {
      // when ... we want the ledger from the storage of a contract
      // then ... it should fetch and format as expected
      const httpStub = { get: jest.fn().mockResolvedValue(storage) }
      const result = await SUT._getLedgerFromStorage(httpStub as any)({
        network: Network.ghostnet,
        contract: 'CONTRACT',
      })

      expect(result).toEqual(expected)
    })

    it('should fail to get ledger data', async () => {
      // when ... getting the ledger data fails
      // then ... it should fail as expected
      const httpStub = { get: jest.fn().mockRejectedValue(new Error('Getting storage failed')) }
      const result = await SUT._getLedgerFromStorage(httpStub as any)({
        network: Network.ghostnet,
        contract: 'CONTRACT',
      })

      expect(result).toEqual(new Error('Getting storage failed'))
    })
  })

  describe('getBalance', () => {
    it('should get a users balance', async () => {
      // when ... we want a users balance
      // then ... it should fetch and format as expected
      const httpStub = { get: jest.fn().mockResolvedValue({ data: 10 }) }
      const result = await SUT._getBalance(httpStub as any)({
        network: Network.ghostnet,
        contract: 'CONTRACT',
      })

      expect(result).toEqual(10)
    })

    it('should fail to get the balance', async () => {
      // when ... getting the balance fails
      // then ... it should fail as expected
      const httpStub = { get: jest.fn().mockRejectedValue(new Error('Getting balance failed')) }
      const result = await SUT._getBalance(httpStub as any)({
        network: Network.ghostnet,
        contract: 'CONTRACT',
      })

      expect(result).toEqual(new Error('Getting balance failed'))
    })

    describe('getTokenBalance', () => {
      it('should get a users balance for a specific token', async () => {
        // when ... we want a users balance for a specific token
        // then ... it should fetch and format as expected
        const httpStub = {
          get: jest.fn().mockResolvedValue({
            data: [
              {
                metadata: {
                  decimals: '6',
                },
                balance: '1000000',
              },
            ],
          }),
        }
        const result = await SUT._getTokenBalance(httpStub as any)({
          network: Network.ghostnet,
          contract: 'CONTRACT',
          pkh: validPkh,
          tokenId: '0',
        })

        expect(result).toEqual(1)
      })

      it('should fail to get the token balance', async () => {
        // when ... getting the token balance fails
        // then ... it should fail as expected
        const httpStub = { get: jest.fn().mockRejectedValue(new Error('Getting token balance failed')) }
        const result = await SUT._getTokenBalance(httpStub as any)({
          network: Network.ghostnet,
          contract: 'CONTRACT',
          pkh: validPkh,
          tokenId: '0',
        })
        expect(result).toEqual(new Error('Getting token balance failed'))
      })
    })
  })
})
