export namespace ReownAuthenticationWebhooks {
  export type EventName =
    | 'ACCOUNT_CREATED'
    | 'ACCOUNT_CONNECTED'
    | 'ACCOUNT_METADATA_CHANGED'
    | 'ACCOUNT_EMAIL_CHANGED'
    | 'ACCOUNT_DELETED';

  export type RequestBody = {
    uuid: string;
  } & (
    | {
        event: Omit<EventName, 'ACCOUNT_DELETED'>;
        data: {
          accountUuid: string;
          createdAt: string;
          updatedAt: string;
          lastSignedIn: string;
          address: string;
          namespace: string;
          chainId: string;
          profile: {
            profileUuid: string;
            metadata: unknown;
            email: string | null;
          };
        };
      }
    | {
        event: Extract<EventName, 'ACCOUNT_DELETED'>;
        data: {
          accountUuid: string;
        };
      }
  );
}
