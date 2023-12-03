// eslint.config.js
import antfu from '@antfu/eslint-config'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat()

export default await antfu(
  {
    // Enable stylistic formatting rules
    // stylistic: true,

    // Or customize the stylistic rules
    stylistic: {
      indent: 2, // 4, or 'tab'
      quotes: 'single', // or 'double'
    },

    // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
    ignores: [
      'devices',
      'node_modules',
      'generic',
    ],

  },
  // Legacy config
  ...compat.config({
    extends: [],
  }),
)
