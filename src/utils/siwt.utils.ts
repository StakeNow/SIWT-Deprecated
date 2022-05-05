import { char2Bytes } from '@taquito/utils'
import { always, join, pipe, prop } from 'ramda'

import { TEZOS_SIGNED_MESSAGE_PREFIX } from '../constants'
import { MessagePayloadData, SignInMessageData } from '../types'

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
