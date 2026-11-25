// Used by use-local-sdk.sh: points every @walletconnect/{types,utils,core,sign-client} dependency,
// direct or transitive, at the tarballs in LOCAL_SDK_DIR.
const path = require('path')

const dir = process.env.LOCAL_SDK_DIR
const local = ['types', 'utils', 'core', 'sign-client']

function readPackage(pkg) {
  if (!dir) return pkg
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const deps = pkg[field]
    if (!deps) continue
    for (const name of local) {
      const full = `@walletconnect/${name}`
      if (deps[full]) deps[full] = `file:${path.join(dir, `${name}.tgz`)}`
    }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
