/**
 * EIP7715Method
 */
export const EIP7715_METHOD = {
  WALLET_GRANT_PERMISSIONS: 'wallet_grantPermissions'
}
// The types of keys that are supported for the following `key` and `keys` signer types.
export enum SignerKeyType {
  SECP256K1 = 0, // EOA - k1
  SECP256R1 = 1 // Passkey - r1
}
