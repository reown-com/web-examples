import PageHeader from '@/components/PageHeader'
import PairingCard from '@/components/PairingCard'
import { walletConnectClient } from '@/utils/WalletConnectUtil'
import { Text } from '@nextui-org/react'
import { ERROR } from '@walletconnect/utils'
import { Fragment, useState } from 'react'

export default function PairingsPage() {
  const [pairings, setPairings] = useState(walletConnectClient.pairing.values)

  async function onDelete(topic: string) {
    await walletConnectClient.pairing.delete({
      topic,
      reason: ERROR.DELETED.format()
    })
    const newPairings = pairings.filter(pairing => pairing.topic !== topic)
    setPairings(newPairings)
  }

  return (
    <Fragment>
      <PageHeader>Pairings</PageHeader>
      {pairings.length ? (
        pairings.map(pairing => {
          const { metadata } = pairing.state
          console.log(pairing)

          return (
            <PairingCard
              key={pairing.topic}
              logo={metadata?.icons[0]}
              url={metadata?.url}
              name={metadata?.name}
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
