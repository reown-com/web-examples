# Appkit SIWE Example for Next.js Router

A Minimal demo using React so developers can work on their integration with WalletConnect and SIWE using this repository as a template.

1. Install dependencies in the frontend: `pnpm install`

2. Create and complete the .env.local file with your Project Id from http://cloud.reown.com

```
NEXT_PUBLIC_PROJECT_ID=...
NEXTAUTH_SECRET=<any-random-text>
```

3. Run the frontend: `pnpm run dev`

4. Open in your browser 

## Server side

 It verifies user signatures using NextAuth, through the Sign-In with Ethereum (SIWE) protocol, ensuring the integrity and authenticity of the sign-in process. 

## Reference

- https://docs.reown.com/appkit/react/core/siwe
- https://docs.login.xyz/general-information/siwe-overview/eip-4361
- https://next-auth.js.org/