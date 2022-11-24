/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

export enum Network {
  mainnet = 'mainnet',
  ghostnet = 'ghostnet',
}

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

export enum ConditionType {
  nft = 'nft',
  xtzBalance = 'xtzBalance',
  tokenBalance = 'tokenBalance',
  whitelist = 'whitelist',
}

export enum Comparator {
  eq = '=',
  gte = '>=',
  lte = '<=',
  gt = '>',
  lt = '<',
  in = 'IN',
  notIn = 'NOT IN'
}

export enum AssetContractType {
  single = 'Single',
  multi = 'Multi',
  nft = 'Nft',
  unknown = 'Unknown',
}

export interface AccessControlQueryDependencies {
  getLedgerFromStorage?: ({
    network,
    contract,
  }: {
    network: Network
    contract: string
  }) => Promise<Pick<unknown, never>[] | void>
  getBalance?: ({ network, contract }: { network: Network; contract: string }) => Promise<number>
  getTokenBalance?: ({
    network,
    contract,
    pkh,
    tokenId,
  }: {
    network: Network
    contract: string
    pkh: string
    tokenId: string
  }) => Promise<number>
  whitelist?: string[]
}

export interface AccessControlQuery {
  network?: Network
  parameters: {
    pkh?: string
  }
  test: {
    contractAddress?: string
    tokenId?: string
    type: ConditionType
    comparator: Comparator
    value?: number
  }
}

export interface TestResult {
  passed: boolean
  ownedTokenIds?: any[]
  balance?: number
}

export interface LedgerAsset {
  key: string
  value: string
}

export interface LedgerNFTAsset {
  key: {
    nat: string
    address: String
  }
  value: string
}

export type LedgerStorage = LedgerAsset | LedgerNFTAsset
