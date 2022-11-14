/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

import { verifySignature as taquitoVerifySignature } from '@taquito/utils'
import jwt from 'jsonwebtoken'
import type { sign as Sign, verify as Verify } from 'jsonwebtoken'
import axios, { AxiosInstance } from 'axios'
import { assoc, equals, objOf, pipe, prop, gte } from 'ramda'

import {
  AccessControlQuery,
  SignInMessageData,
  SignInPayload,
  TokenPayload,
  Comparator,
  ContractLedgerItem,
  Network,
} from './types'
import { constructSignPayload, generateMessageData, packMessagePayload } from './utils'
import { ACCESS_TOKEN_EXPIRATION, API_URLS, ID_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION } from './constants'
import {
  filterOwnedAssets,
  getOwnedAssetIds,
} from './utils/siwt.utils'

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
      { expiresIn: ACCESS_TOKEN_EXPIRATION }
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

export const getContractStorage = (network: Network) => (contractAddress: string) =>
  axios
    .get(`https://${API_URLS[network]}/v1/contracts/${contractAddress}/bigmaps/ledger/keys?limit=10000`)
    .then(prop('data'))
    .catch(console.log)

export const _queryAccessControl =
  (contractStorage: (network: Network) => (x: string) => Promise<ContractLedgerItem[]>) =>
  async ({ contractAddress, network = Network.ghostnet, parameters: { pkh }, test: { comparator, value } }: AccessControlQuery) => {
    try {
      const storage = await contractStorage(network)(contractAddress)
      const ownedAssets = filterOwnedAssets(pkh as string)(storage)
      
      const compareList = {
        [Comparator.equals]: equals(prop('length')(ownedAssets))(value),
        [Comparator.greater]: gte(prop('length')(ownedAssets) as number)(value),
      }

      const ownedAssetIds = getOwnedAssetIds(ownedAssets)

      return {
        contractAddress,
        network,
        pkh,
        tokens: ownedAssetIds,
        passedTest: compareList[comparator],
      }
    } catch {
      return {
        contractAddress,
        pkh,
        network,
        tokens: [],
        passedTest: false,
      }
    }
  }

export const queryAccessControl = _queryAccessControl(getContractStorage)
