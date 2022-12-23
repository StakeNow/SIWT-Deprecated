/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

import { char2Bytes, validateAddress } from '@taquito/utils'
import {
  always,
  cond,
  divide,
  equals,
  filter,
  gt,
  head,
  ifElse,
  join,
  map,
  path,
  pathEq,
  pathOr,
  pipe,
  prop,
  propEq,
  propOr,
  replace,
  T,
  uniq,
} from 'ramda'

import { COMPARISONS, TEZOS_SIGNED_MESSAGE_PREFIX } from '../constants'
import {
  AccessControlQuery,
  AccessControlQueryDependencies,
  AssetContractType,
  LedgerStorage,
  MessagePayloadData,
  Network,
  SignInMessageData,
} from '../types'

export const formatPoliciesString = ifElse(
  propEq('length', 1),
  join(''),
  pipe(join(', '), replace(/,([^,]*)$/, ' and$1')),
)

export const generateMessageData = ({ dappUrl, pkh, options = { policies: [] } }: SignInMessageData) => ({
  dappUrl,
  timestamp: new Date().toISOString(),
  message: `${dappUrl} would like you to sign in with ${pkh}. ${
    gt(pathOr(0, ['policies', 'length'])(options), 0)
      ? `By signing this message you accept our ${formatPoliciesString(prop('policies')(options))}`
      : ''
  }`,
})

export const constructSignPayload = ({ payload, pkh }: { payload: string; pkh: string }) => ({
  signingType: 'micheline',
  payload,
  sourceAddress: pkh,
})

export const packMessagePayload = (messageData: MessagePayloadData): string =>
  pipe(
    always([
      TEZOS_SIGNED_MESSAGE_PREFIX,
      prop('dappUrl')(messageData),
      prop('timestamp')(messageData),
      prop('message')(messageData),
    ]),
    join(' '),
    char2Bytes,
    (bytes: string) => ['05', '01', prop('length')(bytes).toString(16).padStart(8, '0'), bytes],
    join(''),
  )(messageData)

export const filterOwnedAssetsFromNFTAssetContract = (pkh: string) => filter(propEq('value', pkh))
export const filterOwnedAssetsFromSingleAssetContract = (pkh: string) => filter(propEq('key', pkh))
export const filterOwnedAssetsFromMultiAssetContract = (pkh: string) => filter(pathEq(['key', 'address'], pkh))

export const determineContractAssetType = pipe(
  head,
  cond([
    [pipe(prop('key'), validateAddress, equals(3)), always(AssetContractType.single)],
    [pipe(propOr('', 'value'), validateAddress, equals(3)), always(AssetContractType.nft)],
    [pipe(path(['key', 'address']), validateAddress, equals(3)), always(AssetContractType.multi)],
    [T, always(AssetContractType.unknown)],
  ]),
)

export const filterOwnedAssets = (pkh: string) =>
  cond([
    [
      pipe(determineContractAssetType, equals(AssetContractType.nft)),
      filterOwnedAssetsFromNFTAssetContract(pkh) as any,
    ],
    [
      pipe(determineContractAssetType, equals(AssetContractType.multi)),
      filterOwnedAssetsFromMultiAssetContract(pkh) as any,
    ],
    [
      pipe(determineContractAssetType, equals(AssetContractType.single)),
      filterOwnedAssetsFromSingleAssetContract(pkh) as any,
    ],
    [T, always([])],
  ])

export const getOwnedAssetIds = cond([
  [pipe(determineContractAssetType, equals(AssetContractType.nft)), pipe(map(propOr('', 'key')), uniq)],
  [pipe(determineContractAssetType, equals(AssetContractType.multi)), pipe(map(pathOr('', ['key', 'nat'])), uniq)],
  [pipe(determineContractAssetType, equals(AssetContractType.single)), pipe(map(propOr('', 'value')), uniq)],
  [T, always([])],
])

export const validateNFTCondition =
  (getLedgerFromStorage: AccessControlQueryDependencies['getLedgerFromStorage']) =>
  ({
    network = Network.ghostnet,
    parameters: { pkh },
    test: { contractAddress, comparator, value },
  }: AccessControlQuery) =>
    getLedgerFromStorage({ network, contract: contractAddress })
      .then(storage => {
        const ownedAssets = filterOwnedAssets(pkh as string)(storage as LedgerStorage[])
        const ownedAssetIds = getOwnedAssetIds(ownedAssets)

        return {
          passed: (COMPARISONS[comparator] as any)(prop('length')(ownedAssets))(value),
          ownedTokenIds: ownedAssetIds,
        }
      })
      .catch(() => ({
        passed: false,
        error: true,
      }))

export const validateXTZBalanceCondition =
  (getBalance: AccessControlQueryDependencies['getBalance']) =>
  ({ network = Network.ghostnet, test: { contractAddress, comparator, value } }: AccessControlQuery) =>
    getBalance({ network, contract: contractAddress })
      .then((balance: number) => ({
        balance,
        passed: (COMPARISONS[comparator] as any)(balance)(value),
      }))
      .catch(() => ({
        passed: false,
        error: true,
      }))

export const validateTokenBalanceCondition =
  (getTokenBalance: AccessControlQueryDependencies['getTokenBalance']) =>
  ({
    network = Network.ghostnet,
    test: { contractAddress, comparator, value, tokenId },
    parameters: { pkh },
  }: AccessControlQuery) =>
    getTokenBalance({ network, contract: contractAddress, pkh: pkh as string, tokenId: tokenId as string })
      .then((balance: number) => ({
        balance,
        passed: (COMPARISONS[comparator] as any)(balance)(value),
      }))
      .catch(() => ({
        passed: false,
        error: true,
      }))

export const denominate = ([x, y]: number[]) => divide(y, 10 ** x)
