export namespace ReownAuthenticationWebhooks {
  export type EventName = RequestBody['event'];

  export type RequestBody = {
    uuid: string;
  } & (
    | {
        event: 'ACCOUNT_CREATED';
        data: {
          accountUuid: string;
          createdAt: string;
          updatedAt: string;
          lastSignedIn: string;
          address: string;
          namespace: string;
          chainId: string;
          profileUuid: string;
          metadata: unknown;
          email: string | null;
        };
      }
    | {
        event: 'ACCOUNT_CONNECTED';
        data: {
          accountUuid: string;
          lastSignedIn: string;
          address: string;
          namespace: string;
          chainId: string;
        };
      }
    | {
        event: 'ACCOUNT_DELETED';
        data: {
          accountUuid: string;
        };
      }
    | {
        event: 'PROFILE_UPDATED';
        data: {
          profileUuid: string;
          metadata: unknown;
          email: string | null;
          affectedAccounts: string[];
        };
      }
  );
}
