import PageHeader from '@/components/PageHeader'
import PairingCard from '@/components/PairingCard'
import { signClient } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { getSdkError } from '@walletconnect/utils'
import { Fragment, useState } from 'react'

export default function PairingsPage() {
  const [pairings, setPairings] = useState(signClient.pairing.values)

  async function onDelete(topic: string) {
    await signClient.disconnect({ topic, reason: getSdkError('USER_DISCONNECTED') })
    const newPairings = pairings.filter(pairing => pairing.topic !== topic)
    setPairings(newPairings)
  }

  return (
    <Fragment>
      <PageHeader title="Pairings" />
      {pairings.length ? (
        pairings.map(pairing => {
          const { peerMetadata } = pairing

          return (
            <PairingCard
              key={pairing.topic}
              logo={peerMetadata?.icons[0]}
              url={peerMetadata?.url}
              name={peerMetadata?.name}
              onDelete={() => onDelete(pairing.topic)}
            />
          )
        })
      ) : (
        <Text css={{ opacity: '0.5', textAlign: 'center', marginTop: '$20' }}>No pairings</Text>
      )}
    </Fragment>
  )
}
