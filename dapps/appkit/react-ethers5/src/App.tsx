import { createAppKit } from '@reown/appkit/react'
import { projectId, metadata, networks, ethers5Adapter  } from './config'
import { ActionButtonList } from './components/ActionButtonList'
import { InfoList } from './components/InfoList'

import "./App.css"

// Create a AppKit instance
createAppKit({
  adapters: [ethers5Adapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})

export function App() {

  return (
    <div className={"pages"}>
      <img src="/reown.svg" alt="Reown" style={{ width: '150px', height: '150px' }} />
      <h1>AppKit ethers v5 React dApp Example</h1>
      <appkit-button />
      <ActionButtonList />
      <InfoList />
    </div>
  )
}

export default App
