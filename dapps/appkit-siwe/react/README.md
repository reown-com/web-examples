# SIWE Quickstart with WalletConnect

A Minimal demo using React so developers can work on their integration with WalletConnect and SIWE using this repository as a template.

1. Install dependencies in the frontend: `pnpm install`

2. Create and complete the .env.local file with your Project Id from http://cloud.walletconnect.com

```
VITE_PROJECT_ID=...
```

3. Run the frontend: `pnpm run dev`

4. Create a new console and install dependencies in the server

```
cd server 
pnpm install
```

5. Run the server:  `pnpm start`

6. Open in your browser http://localhost:5173/ 
(the frontend address must be the same that you have in the server cors config)
