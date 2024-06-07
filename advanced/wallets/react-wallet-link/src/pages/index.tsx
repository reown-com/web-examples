import AccountCard from '@/components/AccountCard'
import AccountPicker from '@/components/AccountPicker'
import PageHeader from '@/components/PageHeader'
import { EIP155_MAINNET_CHAINS } from '@/data/EIP155Data'
import { Spinner, Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useWeb3ModalAccount } from '@web3modal/ethers/react'

export default function HomePage() {
  // const { address } = useWeb3ModalAccount()
  const address = '0x1234567890123456789012345678901234567890'
  return address ? (
    <Fragment>
      <PageHeader title="Accounts">
        <AccountPicker data-testid="account-picker" />
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
  ) : <Spinner />
}
