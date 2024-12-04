import AccountCard from '@/components/AccountCard'
import PageHeader from '@/components/PageHeader'
import { EIP155_MAINNET_CHAINS } from '@/data/EIP155Data'
import { Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { Box } from '@mui/material'

export default function HomePage() {
  const { address } = useAppKitAccount()
  return address ? (
    <Fragment>
      <PageHeader title="Accounts">
        <Box display="flex" alignItems="center" width="100%">
          <w3m-button />
        </Box>
      </PageHeader>
      <Text h4 css={{ marginBottom: '$5' }}>
        Mainnets
      </Text>
      {Object.entries(EIP155_MAINNET_CHAINS).map(([caip10, { name, logo, rgb }]) => (
        <AccountCard
          key={name}
          name={name}
          logo={logo}
          rgb={rgb}
          address={address}
          chainId={caip10.toString()}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}
    
    </Fragment>
  ) : <w3m-connect-button />
}
