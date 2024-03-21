// define mode and exec type enums
export const CALLTYPE_SINGLE = "0x00" // 1 byte
export const CALLTYPE_BATCH = "0x01" // 1 byte
export const EXECTYPE_DEFAULT = "0x00" // 1 byte
export const EXECTYPE_TRY = "0x01" // 1 byte
export const EXECTYPE_DELEGATE = "0xFF" // 1 byte
export const MODE_DEFAULT = "0x00000000" // 4 bytes
export const UNUSED = "0x00000000" // 4 bytes
export const MODE_PAYLOAD = "0x00000000000000000000000000000000000000000000" // 22 bytes
