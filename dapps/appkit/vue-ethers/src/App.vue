
<template>
  <div class="pages">
     <img src="/reown.svg" alt="Reown" width="150" height="150" />
     <h1>AppKit ethers vue Example</h1>

     <appkit-button />
     <ActionButtonList />
     <InfoList />
   </div>
</template>


<script lang="ts">
import {
  createAppKit,
} from '@reown/appkit/vue'
import {ethersAdapter , networks, projectId } from './config/index'

import ActionButtonList from "./components/ActionButton.vue"
import InfoList from "./components/InfoList.vue";

// Initialize AppKit
createAppKit({
  adapters: [ethersAdapter],
  networks,
  projectId,
  metadata: {
    name: 'AppKit Vue Example',
    description: 'AppKit Vue Example',
    url: 'https://reown.com/appkit',
    icons: ['https://avatars.githubusercontent.com/u/179229932?s=200&v=4']
  }
})

export default {
  name: "App",
  components: {
    ActionButtonList,
    InfoList
  },
};
</script>