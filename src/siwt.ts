import { verifySignature as taquitoVerifySignature } from '@taquito/utils'
import jwt from 'jsonwebtoken'
import type { sign as Sign, verify as Verify } from 'jsonwebtoken'
import axios, { AxiosInstance } from 'axios'
import { add, assoc, objOf, pipe, prop } from 'ramda'

import { AccessControlQuery, SignInMessageData, SignInPayload, TokenPayload } from './types'
import { constructSignPayload, generateMessageData, packMessagePayload } from './utils'
import { ACCESS_TOKEN_EXPIRATION, ID_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION } from './constants'

export const createMessagePayload = (signatureRequestData: SignInMessageData) =>
  pipe(
    generateMessageData,
    packMessagePayload,
    objOf('payload'),
    assoc('pkh', prop('pkh')(signatureRequestData)),
    constructSignPayload,
  )(signatureRequestData)

export const _signIn = (http: AxiosInstance) => (baseUrl: string) => (payload: SignInPayload) =>
  http({
    baseURL: baseUrl,
    method: 'POST',
    url: '/signin',
    data: payload,
  })

const http = axios.create({
  timeout: 1000,
})

export const signIn = _signIn(http)

export const verifySignature = taquitoVerifySignature

export const _generateIdToken =
  (sign: typeof Sign) =>
  ({ pkh, claims = {}, userInfo = {} }: TokenPayload) =>
    sign(
      {
        ...claims,
        pkh,
        ...userInfo,
      },
      process.env.ID_TOKEN_SECRET as string,
      { expiresIn: ID_TOKEN_EXPIRATION },
    )
export const generateIdToken = _generateIdToken(jwt.sign)

export const _generateAccessToken =
  (sign: typeof Sign) =>
  ({ pkh, claims = {} }: TokenPayload) =>
    sign(
      {
        ...claims,
        sub: pkh,
        iat: Date.now(),
        exp: add(Date.now(), ACCESS_TOKEN_EXPIRATION),
      },
      process.env.ACCESS_TOKEN_SECRET as string,
    )
export const generateAccessToken = _generateAccessToken(jwt.sign)

export const _generateRefreshToken = (sign: typeof Sign) => (pkh: string) =>
  sign({ pkh }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: REFRESH_TOKEN_EXPIRATION })
export const generateRefreshToken = _generateRefreshToken(jwt.sign)

export const _verifyAccessToken = (verify: typeof Verify) => (accessToken: string) => {
  try {
    const { sub } = verify(accessToken, process.env.ACCESS_TOKEN_SECRET as string)
    return sub
  } catch {
    return false
  }
}
export const verifyAccessToken = _verifyAccessToken(jwt.verify)

export const _verifyRefreshToken = (verify: typeof Verify) => (refreshToken: string) =>
  verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string)
export const verifyRefreshToken = _verifyRefreshToken(jwt.verify)

export const queryAccessControl = ({ contractAddress, parameters: { pkh } }: AccessControlQuery) => ({
  contractAddress,
  pkh,
  tokenId: 'KT1_1',
})
