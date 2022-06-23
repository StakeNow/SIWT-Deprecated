export interface MessagePayloadData {
  dappUrl: string
  timestamp: string
  message: string
}

export interface SignInMessageData {
  dappUrl: string
  pkh: string
}

export interface SignInPayload {
  message: string
  signature: string
  pk: string
  pkh: string
}

export interface TokenPayload {
  pkh: string
  claims?: Record<string, string | number>
  userInfo?: Record<string, any>
}

export enum Comparator {
  equals = '=',
  greater = '>=',
}

export enum AssetContractType {
  single = 'Single',
  multi = 'Multi',
  nft = 'Nft',
  unknown = 'Unknown',
}

export interface AccessControlQuery {
  nodeAddress?: string
  contractAddress: string
  parameters: {
    pkh?: string
  }
  test: {
    comparator: Comparator
    value: number
  }
}

interface MultiAssetKey {
  nat: number
  address: string
}

export type ContractLedgerItem = {
  id?: number
  active?: boolean
  hash?: string
  value: string | number
  key: string | number | MultiAssetKey
  firstLevel?: number
  lastLevel?: number
  updates?: number
}
