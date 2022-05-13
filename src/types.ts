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
