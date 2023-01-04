import SignClient from '@walletconnect/sign-client'
import { WalletClient as PushWalletClient } from '@walletconnect/push-client'
import { ICore } from '@walletconnect/types'

export let signClient: SignClient
export let pushClient: PushWalletClient

export async function createSignClient(core: ICore) {
  signClient = await SignClient.init({
    core,
    logger: 'debug',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })
}

export async function createPushClient(core: ICore) {
  // Set up the client
  pushClient = await PushWalletClient.init({
    core,
    logger: 'debug',
    metadata: {
      name: 'React Wallet',
      description: 'React Wallet for WalletConnect',
      url: 'https://walletconnect.com/',
      icons: ['https://avatars.githubusercontent.com/u/37784886']
    }
  })

  // Listen for relevant push events
  pushClient.on('push_request', async ({ id, topic, params }) => {
    await pushClient.approve({ id })
    console.log('[PUSH DEMO] Auto-approved push request with id: ' + id)
  })
  pushClient.on('push_message', async args => {
    console.log('[PUSH DEMO] Received push message: ', args)
    const {
      params: { message }
    } = args
    new Notification(message.title, { body: message.body, icon: message.icon })
  })

  // -- Web Notifications API --

  // Check if the browser supports the Web Notification API
  if (!('Notification' in window)) {
    console.error('This browser does not support the Web Notification API')
    return
  }

  // Request permission to display notifications
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      // If the user grants permission, create and display a notification
      console.log('Notification API: Permission granted')
    }
  })
}
