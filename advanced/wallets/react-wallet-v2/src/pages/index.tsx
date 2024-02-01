import AccountCard from '@/components/AccountCard'
import AccountPicker from '@/components/AccountPicker'
import PageHeader from '@/components/PageHeader'
import { EIP155_MAINNET_CHAINS, EIP155_TEST_CHAINS } from '@/data/EIP155Data'
import { SOLANA_MAINNET_CHAINS, SOLANA_TEST_CHAINS } from '@/data/SolanaData'
import { POLKADOT_MAINNET_CHAINS, POLKADOT_TEST_CHAINS } from '@/data/PolkadotData'
import { MULTIVERSX_MAINNET_CHAINS, MULTIVERSX_TEST_CHAINS } from '@/data/MultiversxData'
import { TRON_MAINNET_CHAINS, TRON_TEST_CHAINS } from '@/data/TronData'
import { NEAR_TEST_CHAINS } from '@/data/NEARData'
import { KADENA_MAINNET_CHAINS, KADENA_TEST_CHAINS } from '@/data/KadenaData'
import SettingsStore from '@/store/SettingsStore'
import { Text } from '@nextui-org/react'
import { Fragment } from 'react'
import { useSnapshot } from 'valtio'
import SmartAccountCard from '@/components/SmartAccountCard'

export default function HomePage() {
  const {
    testNets,
    eip155Address,
    activeChainId,
    solanaAddress,
    polkadotAddress,
    nearAddress,
    multiversxAddress,
    tronAddress,
    kadenaAddress
  } = useSnapshot(SettingsStore.state)

  return (
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
          address={eip155Address}
          chainId={caip10.toString()}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}
      {Object.entries(SOLANA_MAINNET_CHAINS).map(([caip10, { name, logo, rgb }]) => (
        <AccountCard
          key={name}
          name={name}
          logo={logo}
          rgb={rgb}
          address={solanaAddress}
          chainId={caip10}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}
      {Object.entries(POLKADOT_MAINNET_CHAINS).map(([caip10, { name, logo, rgb }]) => (
        <AccountCard
          key={name}
          name={name}
          logo={logo}
          rgb={rgb}
          address={polkadotAddress}
          chainId={caip10}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}
      {Object.entries(MULTIVERSX_MAINNET_CHAINS).map(([caip10, { name, logo, rgb }]) => (
        <AccountCard
          key={name}
          name={name}
          logo={logo}
          rgb={rgb}
          address={multiversxAddress}
          chainId={caip10}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}
      {Object.entries(TRON_MAINNET_CHAINS).map(([caip10, { name, logo, rgb }]) => (
        <AccountCard
          key={name}
          name={name}
          logo={logo}
          rgb={rgb}
          address={tronAddress}
          chainId={caip10}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}
      {Object.entries(KADENA_MAINNET_CHAINS).map(([caip10, { name, logo, rgb }]) => (
        <AccountCard
          key={name}
          name={name}
          logo={logo}
          rgb={rgb}
          address={kadenaAddress}
          chainId={caip10}
          data-testid={'chain-card-' + caip10.toString()}
        />
      ))}

      {testNets ? (
        <Fragment>
          <Text h4 css={{ marginBottom: '$5' }}>
            Testnets
          </Text>
          {Object.entries(EIP155_TEST_CHAINS).map(
            ([caip10, { name, logo, rgb, chainId, smartAccountEnabled }]) => {
              if (smartAccountEnabled) {
                return (
                  <SmartAccountCard
                    key={name}
                    name={name}
                    logo={logo}
                    rgb={rgb}
                    address={eip155Address}
                    chainId={caip10.toString()}
                    data-testid={'chain-card-' + caip10.toString()}
                    isActiveChain={activeChainId === `eip155:${chainId}`}
                  />
                )
              }

              return (
                <AccountCard
                  key={name}
                  name={name}
                  logo={logo}
                  rgb={rgb}
                  address={eip155Address}
                  chainId={caip10.toString()}
                  data-testid={'chain-card-' + caip10.toString()}
                />
              )
            }
          )}
          {Object.entries(SOLANA_TEST_CHAINS).map(([caip10, { name, logo, rgb }]) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={solanaAddress}
              chainId={caip10}
              data-testid={'chain-card-' + caip10.toString()}
            />
          ))}
          {Object.entries(POLKADOT_TEST_CHAINS).map(([caip10, { name, logo, rgb }]) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={polkadotAddress}
              chainId={caip10}
              data-testid={'chain-card-' + caip10.toString()}
            />
          ))}
          {Object.entries(NEAR_TEST_CHAINS).map(([caip10, { name, logo, rgb }]) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={nearAddress}
              chainId={caip10}
              data-testid={'chain-card-' + caip10.toString()}
            />
          ))}
          {Object.entries(MULTIVERSX_TEST_CHAINS).map(([caip10, { name, logo, rgb }]) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={multiversxAddress}
              chainId={caip10}
              data-testid={'chain-card-' + caip10.toString()}
            />
          ))}
          {Object.entries(TRON_TEST_CHAINS).map(([caip10, { name, logo, rgb }]) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={tronAddress}
              chainId={caip10}
              data-testid={'chain-card-' + caip10.toString()}
            />
          ))}
          {Object.entries(KADENA_TEST_CHAINS).map(([caip10, { name, logo, rgb }]) => (
            <AccountCard
              key={name}
              name={name}
              logo={logo}
              rgb={rgb}
              address={kadenaAddress}
              chainId={caip10}
              data-testid={'chain-card-' + caip10.toString()}
            />
          ))}
        </Fragment>
      ) : null}
    </Fragment>
  )
}
