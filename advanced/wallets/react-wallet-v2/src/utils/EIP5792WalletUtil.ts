import { eip155Addresses } from './EIP155WalletUtil'
import { GetCapabilitiesResult, supportedEIP5792CapabilitiesForEOA, supportedEIP5792CapabilitiesForSCA } from '@/data/EIP5792Data'

export function getWalletCapabilities(addresses:string[]){
  const walletCapabilities:GetCapabilitiesResult = {}
  addresses.forEach(address => {
      const namespacesAddress = address.split(':');
      // address will be the last index element whether
      // its a simple address or namespace:chainId:address
      const addr = namespacesAddress[namespacesAddress.length - 1 ] ;
      
      if(eip155Addresses.includes(addr) && Object.keys(supportedEIP5792CapabilitiesForEOA).length !== 0){
        walletCapabilities[addr] = supportedEIP5792CapabilitiesForEOA
      }
      
      walletCapabilities[addr] = supportedEIP5792CapabilitiesForSCA
      
  })
  return walletCapabilities
}
