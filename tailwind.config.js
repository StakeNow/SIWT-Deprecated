/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

module.exports = {
  content: ['./demo/ui/*.html'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'bg-red-500',
    'from-red-500',
    'bg-green-500',
    'from-green-500',
    'to-sky-500',
  ],
}
