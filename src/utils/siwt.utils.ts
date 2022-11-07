import { char2Bytes, validateAddress } from '@taquito/utils'
import {
  always,
  cond,
  equals,
  filter,
  head,
  join,
  map,
  path,
  pathEq,
  pathOr,
  pipe,
  prop,
  propEq,
  propOr,
  T,
  uniq,
} from 'ramda'

import { TEZOS_SIGNED_MESSAGE_PREFIX } from '../constants'
import { AssetContractType, MessagePayloadData, SignInMessageData } from '../types'

export const generateMessageData = ({
  dappUrl,
  pkh,
  options = { termsAndConditions: true, privacyPolicy: true },
}: SignInMessageData) => ({
  dappUrl,
  timestamp: new Date().toISOString(),
  message: `${dappUrl} would like you to sign in with ${pkh}. ${
    propOr(false, 'termsAndConditions')(options) || propOr(false, 'privacyPolicy')(options)
      ? 'By signing this message you accept '
      : ''
  }${propOr(false, 'termsAndConditions')(options) ? 'our Terms and Conditions' : ''}${
    propOr(false, 'termsAndConditions')(options) && propOr(false, 'privacyPolicy')(options) ? ' and ' : ''
  }${propOr(false, 'privacyPolicy')(options) ? 'our Privacy Policy' : ''}${
    propOr(false, 'termsAndConditions')(options) || propOr(false, 'privacyPolicy')(options) ? '.' : ''
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
