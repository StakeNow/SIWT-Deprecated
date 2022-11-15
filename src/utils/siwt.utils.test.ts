import { validPkh } from '../fixtures'
import { AccessControlQuery, AssetContractType, Comparator, LedgerStorage } from '../types'
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

  describe('filterOwnedAssetsFromNFTAssetContract', () => {
    it('should filter owned assets from NFT asset contract', () => {
      // when ... we want to filter out the assets owned by the user from an NFT Asset contract
      // then ... it should return only the users assets as expected
      const storage = [
        {
          value: 'PKH',
        },
        {
          value: '',
        },
      ]
      const expected = [
        {
          value: 'PKH',
        },
      ]
      const result = SUT.filterOwnedAssetsFromNFTAssetContract('PKH')(storage)

      expect(result).toEqual(expected)
    })
  })

  describe('filterOwnedAssetsFromSingleAssetContract', () => {
    it('should filter owned assets from Single asset contract', () => {
      // when ... we want to filter out the assets owned by the user from a Single Asset contract
      // then ... it should return only the users assets as expected
      const storage = [
        {
          key: 'PKH',
        },
        {
          key: '',
        },
      ]
      const expected = [
        {
          key: 'PKH',
        },
      ]
      const result = SUT.filterOwnedAssetsFromSingleAssetContract('PKH')(storage)

      expect(result).toEqual(expected)
    })
  })

  describe('filterOwnedAssetsFromMultiAssetContract', () => {
    it('should filter owned assets from Multi asset contract', () => {
      // when ... we want to filter out the assets owned by the user from a Multi Asset contract
      // then ... it should return only the users assets as expected
      const storage = [
        {
          key: { nat: 0, address: 'PKH' },
        },
        {
          key: { nat: 0, address: '' },
        },
      ]
      const expected = [
        {
          key: { nat: 0, address: 'PKH' },
        },
      ]
      const result = SUT.filterOwnedAssetsFromMultiAssetContract('PKH')(storage)

      expect(result).toEqual(expected)
    })
  })

  describe('determineContractAssetType', () => {
    it.each([
      [
        [
          {
            key: validPkh,
            value: '',
          },
        ],
        AssetContractType.single,
      ],
      [
        [
          {
            key: '',
            value: validPkh,
          },
        ],
        AssetContractType.nft,
      ],
      [
        [
          {
            key: {
              nat: '0',
              address: validPkh,
            },
            value: '',
          },
        ],
        AssetContractType.multi,
      ],
      [
        [
          {
            key: '',
            value: '',
          },
        ],
        AssetContractType.unknown,
      ],
    ])(
      'should determine the contract type as expected',
      (ledger: LedgerStorage[], expected: AssetContractType) => {
        // when ... we want to determine what type of contract from the form of the ledger
        // then ... it should determine as expected
        const result = SUT.determineContractAssetType(ledger)
        expect(result).toEqual(expected)
      },
    )
  })

  describe('filterOwnedAssets', () => {
    it.each([
      [
        [
          {
            key: '0',
            value: validPkh,
          },
          {
            key: '0',
            value: '',
          },
        ],
        [
          {
            key: '0',
            value: validPkh,
          },
        ],
      ],
      [
        [
          {
            key: validPkh,
            value: '0',
          },
          {
            key: '',
            value: '0',
          },
        ],
        [
          {
            key: validPkh,
            value: '0',
          },
        ],
      ],
      [
        [
          {
            key: { nat: '0', address: validPkh },
            value: '0',
          },
          {
            key: { nat: '0', address: '' },
            value: '0',
          },
        ],
        [
          {
            key: { nat: '0', address: validPkh },
            value: '0',
          },
        ],
      ],
      [
        [
          {
            key: { nat: '0', address: '' },
            value: '0',
          },
        ],
        [],
      ],
    ])(
      'should filter out the owned assets as expected',
      (ledger: LedgerStorage[], expected: LedgerStorage[] | {}[]) => {
        // when ... we want to filter the users assets from contract storage
        // then ... it should return a users assets as expected
        const pkh = validPkh
        const result = SUT.filterOwnedAssets(pkh)(ledger)

        expect(result).toEqual(expected)
      },
    )
  })

  describe('getOwnedAssetIds', () => {
    it.each([
      [
        [
          {
            key: '1',
            value: validPkh,
          },
        ],
        ['1'],
      ],
      [
        [
          {
            key: validPkh,
            value: '2',
          },
          {
            key: validPkh,
            value: '3',
          },
          {
            key: validPkh,
            value: '2',
          },
        ],
        ['2', '3'],
      ],
      [
        [
          {
            key: { nat: '0', address: validPkh },
            value: '3',
          },
        ],
        ['0'],
      ],
      [[], []],
    ])(
      'should filter out the owned asset ids as expected',
      (ownedAssets: LedgerStorage[], expected: string[]) => {
        // when ... we want to filter the owned asset ids from owned assets
        // then ... it should return a users asset ids as expected
        const result = SUT.getOwnedAssetIds(ownedAssets)

        expect(result).toEqual(expected)
      },
    )
  })

  describe('validateNFTCondition', () => {
    it.each([
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.eq,
            value: 1,
          },
        },
        [{
          key: {
            nat: '0',
            address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          value: '1',
        }],
        {
          passed: true,
          ownedTokenIds: ['0'],
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.gte,
            value: 1,
          },
        },
        [{
          key: {
            nat: '0',
            address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          value: '1',
        }],
        {
          passed: true,
          ownedTokenIds: ['0'],
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.lte,
            value: 1,
          },
        },
        [{
          key: {
            nat: '0',
            address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          value: '1',
        }],
        {
          passed: true,
          ownedTokenIds: ['0'],
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.gt,
            value: 1,
          },
        },
        [{
          key: {
            nat: '0',
            address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          value: '1',
        },
        {
          key: {
            nat: '1',
            address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          value: '1',
        }],
        {
          passed: true,
          ownedTokenIds: ['0', '1'],
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.lt,
            value: 2,
          },
        },
        [{
          key: {
            nat: '0',
            address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          value: '1',
        }],
        {
          passed: true,
          ownedTokenIds: ['0'],
        },
      ],
    ])('should validate if the NFT condition is met', async (query, storage, expected) => {
      // when ... validating the NFT condition
      const getLedgerFromStorageStub = jest.fn().mockResolvedValue(storage)
      const result = await SUT.validateNFTCondition(getLedgerFromStorageStub)(query as any)

      // then ... it should return validation as expected
      expect(result).toEqual(expected)
    })

    it('should fail to validate if the NFT condition is not met', async () => {
      // when ... validating the NFT condition
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
        },
        test: {
          contractAddress: 'CONTRACT',
          comparator: Comparator.lt,
          value: 1,
        },
      }
      const storage = [{
        key: {
          nat: '0',
          address: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
        },
        value: '1',
      }]
      const expected = {
        passed: false,
        ownedTokenIds: ['0'],
      }

      const getLedgerFromStorageStub = jest.fn().mockResolvedValue(storage)
      const result = await SUT.validateNFTCondition(getLedgerFromStorageStub)(query as any)

      // then ... it should return validation as expected
      expect(result).toEqual(expected)
    })

    it('should should return an error if storage cannot be fetched', async () => {
      // when ... validating the NFT condition
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
        },
        test: {
          contractAddress: 'CONTRACT',
          comparator: Comparator.lt,
          value: 1,
        },
      }
      const expected = new Error('Checking NFT condition failed')

      const getLedgerFromStorageStub = jest.fn().mockRejectedValue(new Error('Failed'))
      const result = await SUT.validateNFTCondition(getLedgerFromStorageStub)(query as any)

      // then ... it should return validation as expected
      expect(result).toEqual(expected)
    })
  })

  describe('validateNFTCondition', () => {
    it.each([
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.eq,
            value: 1,
          },
        },
        1,
        {
          passed: true,
          balance: 1,
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.gte,
            value: 1,
          },
        },
        1,
        {
          passed: true,
          balance: 1,
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.lte,
            value: 1,
          },
        },
        1,
        {
          passed: true,
          balance: 1,
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.gt,
            value: 1,
          },
        },
        2,
        {
          passed: true,
          balance: 2,
        },
      ],
      [
        {
          parameters: {
            pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
          },
          test: {
            contractAddress: 'CONTRACT',
            comparator: Comparator.lt,
            value: 2,
          },
        },
        1,
        {
          passed: true,
          balance: 1,
        },
      ],
    ])('should validate if the XTZ balance condition is met', async (query, balance, expected) => {
      // when ... validating the XTZ Balance condition
      const getBalanceStub = jest.fn().mockResolvedValue(balance)
      const result = await SUT.validateXTZBalanceCondition(getBalanceStub)(query as any)

      // then ... it should return validation as expected
      expect(result).toEqual(expected)
    })

    it('should fail to validate if the XTZ Balance condition is not met', async () => {
      // when ... validating the XTZ Balance condition
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
        },
        test: {
          contractAddress: 'CONTRACT',
          comparator: Comparator.gte,
          value: 1,
        },
      }
      const balance = 0
      const expected = {
        passed: false,
        balance: 0,
      }

      const getBalanceStub = jest.fn().mockResolvedValue(balance)
      const result = await SUT.validateXTZBalanceCondition(getBalanceStub)(query as any)

      // then ... it should return validation as expected
      expect(result).toEqual(expected)
    })

    it('should should return an error if storage cannot be fetched', async () => {
      // when ... validating the XTZ Balance condition
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx'
        },
        test: {
          contractAddress: 'CONTRACT',
          comparator: Comparator.lt,
          value: 1,
        },
      }
      const expected = new Error('Checking XTZ Balance condition failed')

      const getBalanceStub = jest.fn().mockRejectedValue(new Error('Failed'))
      const result = await SUT.validateXTZBalanceCondition(getBalanceStub)(query as any)

      // then ... it should return validation as expected
      expect(result).toEqual(expected)
    })
  })
})
