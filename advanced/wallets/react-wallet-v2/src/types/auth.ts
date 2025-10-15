import { AuthTypes } from '@walletconnect/types'

export type AuthenticationMessage = AuthTypes.AuthenticateParams & {
  message: string
  iss: string
}
