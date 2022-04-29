import { verifySignature as taquitoVerifySignature } from '@taquito/utils'
import axios, { AxiosInstance } from 'axios'
import { assoc, objOf, pipe, prop } from 'ramda'

import { signInMessageData } from './types'
import { constructSignPayload, generateMessageData, packMessagePayload } from './utils'

export const createMessagePayload = (signatureRequestData: signInMessageData) =>
  pipe(
    generateMessageData,
    packMessagePayload,
    objOf('payload'),
    assoc('pkh', prop('pkh')(signatureRequestData)),
    constructSignPayload,
  )(signatureRequestData)

export const _signIn =
  (http: AxiosInstance) => (baseUrl: string) => (payload: { message: string; signature: string; pk: string }) =>
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
