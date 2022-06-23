import { validPkh } from './fixtures'
import * as SUT from './siwt'
import { Comparator, Network } from './types'

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
        iat: expect.any(Number),
        exp: expect.any(Number),
      }

      expect(result).toEqual('JWT')
      expect(signStub).toHaveBeenCalledWith(expectedSignPayload, 'ACCESS TOKEN SECRET')
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
    it('should past test when user has token', async () => {
      const storageStub = () => jest.fn().mockResolvedValue([{ value: validPkh, key: 1 }])

      const result = await SUT._queryAccessControl(storageStub)({
        contractAddress: 'CONTRACT',
        parameters: {
          pkh: validPkh,
        },
        test: {
          comparator: Comparator.equals,
          value: 1,
        },
      })

      expect(result).toEqual({
        contractAddress: 'CONTRACT',
        pkh: validPkh,
        network: 'ithacanet',
        tokens: [1],
        passedTest: true,
      })
    })

    it('should past test and return all tokens of the user', async () => {
      const storageStub = () => jest.fn().mockResolvedValue([
        { value: validPkh, key: 1 },
        { value: validPkh, key: 2 },
      ])

      const result = await SUT._queryAccessControl(storageStub)({
        contractAddress: 'CONTRACT',
        network: Network.mainnet,
        parameters: {
          pkh: validPkh,
        },
        test: {
          comparator: Comparator.greater,
          value: 1,
        },
      })

      expect(result).toEqual({
        contractAddress: 'CONTRACT',
        pkh: validPkh,
        network: 'mainnet',
        tokens: [1, 2],
        passedTest: true,
      })
    })

    it('should past test when user has token', async () => {
      const storageStub = () => jest.fn().mockResolvedValue([{ value: validPkh, key: 1 }])

      const result = await SUT._queryAccessControl(storageStub)({
        contractAddress: 'CONTRACT',
        parameters: {
          pkh: validPkh,
        },
        test: {
          comparator: Comparator.equals,
          value: 1,
        },
      })

      expect(result).toEqual({
        contractAddress: 'CONTRACT',
        network: 'ithacanet',
        pkh: validPkh,
        tokens: [1],
        passedTest: true,
      })
    })

    it('should fail when there is no storage', async () => {
      const storageStub = () => jest.fn().mockResolvedValue([])

      const result = await SUT._queryAccessControl(storageStub)({
        contractAddress: 'CONTRACT',
        parameters: {
          pkh: validPkh,
        },
        test: {
          comparator: Comparator.equals,
          value: 1,
        },
      })

      expect(result).toEqual({
        contractAddress: 'CONTRACT',
        pkh: validPkh,
        network: 'ithacanet',
        tokens: [],
        passedTest: false,
      })
    })
  })
})
