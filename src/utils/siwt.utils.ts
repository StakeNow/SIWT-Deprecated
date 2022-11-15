import { char2Bytes, validateAddress } from '@taquito/utils'
import {
  always,
  cond,
  equals,
  filter,
  gt,
  gte,
  head,
  join,
  lt,
  lte,
  map,
  path,
  pathEq,
  pathOr,
  pipe,
  prop,
  propEq,
  propOr,
  T,
  tap,
  uniq,
} from 'ramda'

import { TEZOS_SIGNED_MESSAGE_PREFIX } from '../constants'
import {
  AccessControlQuery,
  AccessControlQueryDependencies,
  AssetContractType,
  Comparator,
  LedgerStorage,
  MessagePayloadData,
  Network,
  SignInMessageData,
} from '../types'

export const generateMessageData = ({ dappUrl, pkh }: SignInMessageData) => ({
  dappUrl,
  timestamp: new Date().toISOString(),
  message: `${dappUrl} would like you to sign in with ${pkh}. 
  `,
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

export const filterOwnedAssetsFromNFTAssetContract = (pkh: string) => pipe(filter(propEq('value', pkh)))
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
    network = Network.ithacanet,
    parameters: { pkh },
    test: { contractAddress, comparator, value },
  }: AccessControlQuery) =>
    getLedgerFromStorage({ network, contract: contractAddress })
      .then(storage => {
        const ownedAssets = filterOwnedAssets(pkh as string)(storage as LedgerStorage[])
        const comparisons = {
          [Comparator.eq]: () => equals,
          [Comparator.gte]: () => gte,
          [Comparator.lte]: () => lte,
          [Comparator.gt]: () => gt,
          [Comparator.lt]: () => lt,
        }

        const ownedAssetIds = getOwnedAssetIds(ownedAssets)

        return {
          passed: comparisons[comparator]()(prop('length')(ownedAssets), value),
          ownedTokenIds: ownedAssetIds,
        }
      })
      .catch(() => {
        throw new Error('Checking NFT condition failed')
      })

export const validateXTZBalanceCondition =
  (getBalance: AccessControlQueryDependencies['getBalance']) =>
  ({ network = Network.ithacanet, test: { contractAddress, comparator, value } }: AccessControlQuery) =>
    getBalance({ network, contract: contractAddress })
      .then((balance: number) => {
        const compareList = {
          [Comparator.eq]: () => equals,
          [Comparator.gte]: () => gte,
          [Comparator.lte]: () => lte,
          [Comparator.gt]: () => gt,
          [Comparator.lt]: () => lt,
        }

        return {
          balance,
          passed: compareList[comparator]()(balance)(value),
        }
      })
      .catch(() => {
        throw new Error('Checking XTZ Balance condition failed')
      })
