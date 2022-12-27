/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

import { complement, equals, gt, gte, includes, lt, lte } from 'ramda'

import { Comparator } from './types'

export const API_URLS = {
  mainnet: 'api.tzkt.io',
  ghostnet: 'api.ghostnet.tzkt.io',
}

export const TEZOS_SIGNED_MESSAGE_PREFIX = 'Tezos Signed Message:'

export const ACCESS_TOKEN_EXPIRATION = 900 // 15 mins

export const ID_TOKEN_EXPIRATION = 36000 // 10 hrs

export const REFRESH_TOKEN_EXPIRATION = 2592000 // 1 month

export const COMPARISONS = {
  [Comparator.eq]: equals,
  [Comparator.gte]: gte,
  [Comparator.lte]: lte,
  [Comparator.gt]: gt,
  [Comparator.lt]: lt,
  [Comparator.in]: includes,
  [Comparator.notIn]: complement(includes),
}
