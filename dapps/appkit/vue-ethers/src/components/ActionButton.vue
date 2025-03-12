<template>
    <div>
      <button @click="openAppKit">Open</button>
      <button @click="disconnect">Disconnect</button>
      <button v-for="network in networks" @click="switchToNetwork(network)">
        {{ network.name }}
      </button>
    </div>
  </template>
  
  <script>
  import { useDisconnect, useAppKit, useAppKitNetwork } from "@reown/appkit/vue";
  import { networks } from "../config/index";
  import type {AppKitNetwork} from "@reown/appkit/networks";
      
  export default {
    name: "ActionButtonList",
    setup() {
      const { disconnect } = useDisconnect();
      const { open } = useAppKit();
      const networkData = useAppKitNetwork();
  
      const openAppKit = () => open();
      const switchToNetwork = (network: AppKitNetwork) => networkData.value.switchNetwork(network);

      return {
        disconnect,
        openAppKit,
        switchToNetwork,
      };
    },
  };
  </script>
  
