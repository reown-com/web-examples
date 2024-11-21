<template>
  <div>
    <section>
      <h2>useAppKit</h2>
      <pre>
Address: {{ accountInfo.address }}
caip Address: {{ accountInfo.caipAddress }}
Connected: {{ accountInfo.isConnected }}
Status: {{ accountInfo.status }}
      </pre>
    </section>

    <section>
      <h2>Theme</h2>
      <pre>
Theme: {{ kitTheme.themeMode }}
      </pre>
    </section>

    <section>
      <h2>State</h2>
      <pre>
open: {{ state.open }}
selectedNetworkId: {{ state.selectedNetworkId }}
      </pre>
    </section>

    <section>
      <h2>WalletInfo</h2>
      <pre>
Name: {{ walletInfo?.name }}<br />
      </pre>
    </section>
  </div>
</template>
  
<script >
import { onMounted } from "vue";
import {
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useAppKitAccount,
  useWalletInfo,
} from "@reown/appkit/vue";

export default {
  name: "InfoList",
  setup(){
    const kitTheme = useAppKitTheme();
    const state = useAppKitState();
    const accountInfo = useAppKitAccount();
    const events = useAppKitEvents();
    const { walletInfo }  = useWalletInfo();

    onMounted(() => {
      console.log("Events: ", events);
    });

    return {
      kitTheme,
      state,
      accountInfo,
      walletInfo,
    };
  },
};
</script>