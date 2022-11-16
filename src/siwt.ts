/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

import { verifySignature as taquitoVerifySignature } from '@taquito/utils'
import jwt from 'jsonwebtoken'
import type { sign as Sign, verify as Verify } from 'jsonwebtoken'
import axios, { AxiosInstance } from 'axios'
import { assoc, objOf, pipe, prop, always, pick, map } from 'ramda'

import {
  AccessControlQuery,
  SignInMessageData,
  SignInPayload,
  TokenPayload,
  Network,
  ConditionType,
  AccessControlQueryDependencies,
  TestResult,
  LedgerStorage,
} from './types'
import { constructSignPayload, generateMessageData, packMessagePayload } from './utils'
import { ACCESS_TOKEN_EXPIRATION, API_URLS, ID_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION } from './constants'
import { validateNFTCondition, validateXTZBalanceCondition } from './utils/siwt.utils'
import { match } from 'ts-pattern'

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
export const generateIdToken = _generateIdToken(jwt?.sign)

export const _generateAccessToken =
  (sign: typeof Sign) =>
  ({ pkh, claims = {} }: TokenPayload) =>
    sign(
      {
        ...claims,
        sub: pkh,
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: ACCESS_TOKEN_EXPIRATION },
    )
export const generateAccessToken = _generateAccessToken(jwt?.sign)

export const _generateRefreshToken = (sign: typeof Sign) => (pkh: string) =>
  sign({ pkh }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: REFRESH_TOKEN_EXPIRATION })
export const generateRefreshToken = _generateRefreshToken(jwt?.sign)

export const _verifyAccessToken = (verify: typeof Verify) => (accessToken: string) => {
  try {
    const { sub } = verify(accessToken, process.env.ACCESS_TOKEN_SECRET as string)
    return sub
  } catch {
    return false
  }
}
export const verifyAccessToken = _verifyAccessToken(jwt?.verify)

export const _verifyRefreshToken = (verify: typeof Verify) => (refreshToken: string) =>
  verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string)
export const verifyRefreshToken = _verifyRefreshToken(jwt?.verify)

export const _getLedgerFromStorage =
  (http: AxiosInstance) =>
  ({ network, contract }: { network: Network; contract: string }) =>
    http
      .get(`https://${API_URLS[network]}/v1/contracts/${contract}/bigmaps/ledger/keys?limit=10000`)
      .then(pipe(prop('data'), map(pick(['key', 'value']))))
      .catch(console.log)

export const getLedgerFromStorage = _getLedgerFromStorage(http)

export const _getBalance =
  (http: AxiosInstance) =>
  ({ network, contract }: { network: Network; contract: string }) =>
    http.get(`https://${API_URLS[network]}/v1/accounts/${contract}/balance`).then(prop('data')).catch(console.log)

export const getBalance = _getBalance(http)

export const _queryAccessControl = (deps: AccessControlQueryDependencies) => async (query: AccessControlQuery) => {
  const {
    network = Network.ghostnet,
    parameters: { pkh },
    test: { type },
  } = query
  const { getLedgerFromStorage, getBalance } = deps
  try {
    const testResults = await match(type)
      .with(ConditionType.nft, () => validateNFTCondition(getLedgerFromStorage)(query))
      .with(ConditionType.xtzBalance, () => validateXTZBalanceCondition(getBalance)(query))
      .otherwise(always(Promise.resolve({ passed: false })))

    return {
      network,
      pkh,
      testResults,
    }
  } catch(error) {
    return error
  }
}

export const queryAccessControl = _queryAccessControl({ getLedgerFromStorage, getBalance })
