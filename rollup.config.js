/*
 * Copyright (C) 2022, vDL Digital Ventures GmbH <info@vdl.digital>
 *
 * SPDX-License-Identifier: MIT
 */

import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'

const pkg = require('./package.json')
const libraryName = 'siwt'

export default {
  input: `src/${libraryName}.ts`,
  output: { file: pkg.main, name: camelCase(libraryName), format: 'umd', sourcemap: true },
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ tsconfig: './tsconfig.json', useTsconfigDeclarationDir: true }),

    // Resolve source maps to the original source
    sourceMaps(),
  ],
}
