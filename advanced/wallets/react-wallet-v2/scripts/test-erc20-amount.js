#!/usr/bin/env node

/**
 * ERC-20 send amount validation (src/utils/Erc20AmountUtil.ts).
 *
 * The module is transpiled on the fly so the cases below run against the real
 * implementation rather than a copy. The rounding cases matter most: viem's
 * `parseUnits` silently rounds fractional digits beyond the token's decimals, so
 * `1.0000005` USDC would otherwise leave the wallet as `1.000001`.
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ts = require('typescript')

function loadAmountUtil() {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'utils', 'Erc20AmountUtil.ts'),
    'utf-8'
  )
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(require, module, module.exports)

  return module.exports
}

const { getAmountError, parseErc20Amount } = loadAmountUtil()

// [amount, decimals, expected base units]
const ACCEPTED = [
  ['1', 6, 1000000n],
  ['1.5', 6, 1500000n],
  ['0.000001', 6, 1n],
  ['1.000001', 6, 1000001n],
  ['123456789.123456789012345678', 18, 123456789123456789012345678n],
  ['1', 0, 1n]
]

// [amount, decimals, substring the error must contain]
const REJECTED = [
  ['1.0000005', 6, 'decimal places'],
  ['0.0000001', 6, 'decimal places'],
  ['0.5', 0, 'decimal places'],
  ['1.1234567890123456789', 18, 'decimal places'],
  ['0', 6, 'greater than zero'],
  ['0.0', 6, 'greater than zero'],
  ['0.000000', 6, 'greater than zero'],
  ['', 6, 'Invalid amount'],
  ['.5', 6, 'Invalid amount'],
  ['1.', 6, 'Invalid amount'],
  ['-1', 6, 'Invalid amount'],
  ['1e6', 6, 'Invalid amount'],
  ['1,5', 6, 'Invalid amount'],
  [' 1', 6, 'Invalid amount'],
  ['0x10', 6, 'Invalid amount']
]

for (const [amount, decimals, expected] of ACCEPTED) {
  const label = `${JSON.stringify(amount)} with ${decimals} decimals`

  assert.equal(getAmountError(amount, decimals), undefined, `${label} should be accepted`)
  assert.equal(parseErc20Amount(amount, decimals), expected, `${label} should parse exactly`)
}

for (const [amount, decimals, fragment] of REJECTED) {
  const label = `${JSON.stringify(amount)} with ${decimals} decimals`
  const error = getAmountError(amount, decimals)

  assert.ok(error, `${label} should be rejected`)
  assert.match(error, new RegExp(fragment), `${label} should explain why`)
  assert.throws(
    () => parseErc20Amount(amount, decimals),
    new RegExp(fragment),
    `${label} should throw`
  )
}

console.log(
  `ERC-20 amount validation: ${ACCEPTED.length} accepted + ${REJECTED.length} rejected cases passed`
)
