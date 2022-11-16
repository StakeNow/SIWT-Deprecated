/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

import { ACCESS_TOKEN_EXPIRATION } from './constants'
import { validPkh } from './fixtures'
import * as SUT from './siwt'
import { Comparator, ConditionType, Network } from './types'

describe('./siwt', () => {
  describe('createMessagePayload', () => {
    it('should create the message payload to be signed', () => {
      // when ... we want to create a message for signing
      // then ... it should create the message as expected
      const signatureRequest = {
        dappUrl: 'URL',
        pkh: 'PKH',
      }
      const expected = {
        payload: expect.any(String),
        signingType: 'micheline',
        sourceAddress: 'PKH',
      }
      const result = SUT.createMessagePayload(signatureRequest)

      expect(result).toEqual(expected)
    })
  })

  describe('signIn', () => {
    it('should call the sign in api endpoint', () => {
      // when ... we want to sign in
      // then ... it should call the sign in endpoint as expected
      const httpStub = jest.fn().mockReturnValue(true)

      const result = SUT._signIn(httpStub as any)('URL')({
        message: 'MESSAGE',
        signature: 'SIGNATURE',
        pk: 'PUBLIC KEY',
        pkh: 'PUBLIC KEY HASH',
      })

      expect(result).toEqual(true)
      expect(httpStub).toHaveBeenCalledWith({
        baseURL: 'URL',
        method: 'POST',
        url: '/signin',
        data: {
          message: 'MESSAGE',
          signature: 'SIGNATURE',
          pk: 'PUBLIC KEY',
          pkh: 'PUBLIC KEY HASH',
        },
      })
    })
  })

  describe('generateIdToken', () => {
    it('should generate the id token', () => {
      // when ... we want to get the ID token
      // then ... it should generate and sign as expected
      process.env.ID_TOKEN_SECRET = 'ID TOKEN SECRET'
      const signStub = jest.fn().mockReturnValue('JWT')
      const payload = {
        pkh: 'PKH',
        claims: {
          iss: 'ISSUER',
        },
        userInfo: {
          tokenId: 1000,
        },
      }

      const result = SUT._generateIdToken(signStub)(payload)
      const expectedSignPayload = {
        pkh: 'PKH',
        iss: 'ISSUER',
        tokenId: 1000,
      }
      expect(result).toEqual('JWT')
      expect(signStub).toHaveBeenCalledWith(expectedSignPayload, 'ID TOKEN SECRET', { expiresIn: 36000 })
    })
  })

  describe('generateAccessToken', () => {
    it('should generate the access token', () => {
      // when ... we want to get the Access token
      // then ... it should generate and sign as expected
      process.env.ACCESS_TOKEN_SECRET = 'ACCESS TOKEN SECRET'
      const signStub = jest.fn().mockReturnValue('JWT')
      const payload = {
        pkh: 'PKH',
        claims: {
          iss: 'ISSUER',
        },
      }

      const result = SUT._generateAccessToken(signStub)(payload)
      const expectedSignPayload = {
        sub: 'PKH',
        iss: 'ISSUER',
      }

      expect(result).toEqual('JWT')
      expect(signStub).toHaveBeenCalledWith(expectedSignPayload, 'ACCESS TOKEN SECRET', {
        expiresIn: ACCESS_TOKEN_EXPIRATION,
      })
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate the refresh token', () => {
      // when ... we want to get the refresh token
      // then ... it should generate and sign as expected
      process.env.REFRESH_TOKEN_SECRET = 'REFRESH TOKEN SECRET'
      const signStub = jest.fn().mockReturnValue('JWT')

      const result = SUT._generateRefreshToken(signStub)('PKH')
      const expectedSignPayload = {
        pkh: 'PKH',
      }

      expect(result).toEqual('JWT')
      expect(signStub).toHaveBeenCalledWith(expectedSignPayload, 'REFRESH TOKEN SECRET', { expiresIn: 2592000 })
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      // when ... we want to verify a valid access token
      // then ... it should return the subject
      process.env.ACCESS_TOKEN_SECRET = 'ACCESS_TOKEN_SECRET'
      const verifyStub = jest.fn().mockReturnValue({
        sub: 'PKH',
      })
      const accessToken = 'VALID ACCESS TOKEN'

      const result = SUT._verifyAccessToken(verifyStub)(accessToken)

      expect(result).toEqual('PKH')
      expect(verifyStub).toHaveBeenCalledWith(accessToken, 'ACCESS_TOKEN_SECRET')
    })

    it('should fail to verify an invalid access token', () => {
      // when ... we want to verify an invalid access token
      // then ... it should return false
      process.env.ACCESS_TOKEN_SECRET = 'ACCESS_TOKEN_SECRET'
      const verifyStub = jest.fn().mockImplementation(() => {
        throw new Error('ERROR MESSAGE')
      })
      const accessToken = 'INVALID ACCESS TOKEN'

      const result = SUT._verifyAccessToken(verifyStub)(accessToken)

      expect(result).toEqual(false)
      expect(verifyStub).toHaveBeenCalledWith(accessToken, 'ACCESS_TOKEN_SECRET')
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      // when ... we want to verify a valid refresh token
      // then ... it should return the subject
      process.env.REFRESH_TOKEN_SECRET = 'REFRESH_TOKEN_SECRET'
      const verifyStub = jest.fn().mockReturnValue({
        pkh: 'PKH',
      })
      const refreshToken = 'VALID REFRESH TOKEN'

      const result = SUT._verifyRefreshToken(verifyStub)(refreshToken)

      expect(result).toEqual({ pkh: 'PKH' })
      expect(verifyStub).toHaveBeenCalledWith(refreshToken, 'REFRESH_TOKEN_SECRET')
    })

    it('should fail to verify an invalid refresh token', () => {
      // when ... we want to verify an invalid refresh token
      // then ... it should throw
      process.env.REFRESH_TOKEN_SECRET = 'REFRESH_TOKEN_SECRET'
      const verifyStub = jest.fn().mockImplementation(() => {
        throw new Error('ERROR MESSAGE')
      })
      const refreshToken = 'INVALID REFRESH TOKEN'

      const result = () => SUT._verifyRefreshToken(verifyStub)(refreshToken)

      expect(result).toThrow()
      expect(verifyStub).toHaveBeenCalledWith(refreshToken, 'REFRESH_TOKEN_SECRET')
    })
  })

  describe('queryAccessControl', () => {
    it('should pass test when user has token', async () => {
      const getLedgerFromStorageStub = jest.fn().mockResolvedValue([{ value: validPkh, key: 1 }])
      const getBalanceStub = jest.fn()

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })({
        parameters: {
          pkh: validPkh,
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.nft,
          comparator: Comparator.eq,
          value: 1,
        },
      })
      expect(result).toEqual({
        pkh: validPkh,
        network: 'ithacanet',
        testResults: {
          ownedTokenIds: [1],
          passed: true,
        },
      })
    })

    it('should pass test and return all tokens of the user', async () => {
      const getLedgerFromStorageStub = jest.fn().mockResolvedValue([
        { value: validPkh, key: 1 },
        { value: validPkh, key: 2 },
      ])
      const getBalanceStub = jest.fn()

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })({
        network: Network.mainnet,
        parameters: {
          pkh: validPkh,
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.nft,
          comparator: Comparator.gt,
          value: 1,
        },
      })

      expect(result).toEqual({
        pkh: validPkh,
        network: 'mainnet',
        testResults: {
          ownedTokenIds: [1, 2],
          passed: true,
        },
      })
    })

    it('should pass test when user has token', async () => {
      const getLedgerFromStorageStub = jest.fn().mockResolvedValue([{ value: validPkh, key: 1 }])
      const getBalanceStub = jest.fn()

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })({
        parameters: {
          pkh: validPkh,
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.nft,
          comparator: Comparator.eq,
          value: 1,
        },
      })

      expect(result).toEqual({
        network: 'ithacanet',
        pkh: validPkh,
        testResults: {
          ownedTokenIds: [1],
          passed: true,
        },
      })
    })

    it('should fail when there is no storage', async () => {
      const getLedgerFromStorageStub = jest.fn().mockResolvedValue([])
      const getBalanceStub = jest.fn()

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })({
        parameters: {
          pkh: validPkh,
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.nft,
          comparator: Comparator.eq,
          value: 1,
        },
      })

      expect(result).toEqual({
        pkh: validPkh,
        network: 'ithacanet',
        testResults: {
          ownedTokenIds: [],
          passed: false,
        },
      })
    })

    it('should fail when ledger cannot be fetched', async () => {
      // when ... we cannot fetch the ledger
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx',
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.nft,
          comparator: Comparator.gte,
          value: 1,
        },
      }

      const getLedgerFromStorageStub = jest.fn().mockRejectedValue({})
      const getBalanceStub = jest.fn()

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })(query as any)

      // then ... it should fail as expected
      const expected = new Error('Checking NFT condition failed')
      expect(result).toEqual(expected)
    })

    it('should allow access when user has sufficient balance', async () => {
      // when ... we want to test if a user has sufficient XTZ
      const balance = 10;
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx',
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.xtzBalance,
          comparator: Comparator.gte,
          value: 1,
        },
      }

      const getLedgerFromStorageStub = jest.fn()
      const getBalanceStub = jest.fn().mockResolvedValue(balance)

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })(query as any)

      // then ... it should return a passed test as expected
      const expected = {
        network: Network.ithacanet,
        pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx',
        testResults: {
          balance,
          passed: true,
        }
      }
      expect(result).toEqual(expected)
    })
    
    it('should fail when balance cannot be fetched', async () => {
      // when ... we cannot fetch XTZ balance
      const balance = 0;
      const query = {
        parameters: {
          pkh: 'tz1L9r8mWmRPndRhuvMCWESLGSVeFzQ9NAWx',
        },
        test: {
          contractAddress: 'CONTRACT',
          type: ConditionType.xtzBalance,
          comparator: Comparator.gte,
          value: 1,
        },
      }

      const getLedgerFromStorageStub = jest.fn()
      const getBalanceStub = jest.fn().mockRejectedValue(balance)

      const result = await SUT._queryAccessControl({
        getLedgerFromStorage: getLedgerFromStorageStub,
        getBalance: getBalanceStub,
      })(query as any)

      // then ... it should fail as expected
      const expected = new Error('Checking XTZ Balance condition failed')
      expect(result).toEqual(expected)
    })
  })
})
