import type { InstitutionConnection } from '@/lib/db/schema';

export type ProviderIdentifier = 'plaid' | 'manual';

export interface LinkTokenRequest {
  userId: string;
  products?: Array<'transactions' | 'investments'>;
  accessToken?: string;
  webhookUrl?: string;
}

export interface LinkTokenResponse {
  linkToken: string;
  expiration?: string;
}

export interface TokenExchangeResponse {
  accessToken: string;
  itemId?: string;
}

export interface NormalizedAccount {
  id: string;
  name: string;
  officialName?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
  currency?: string | null;
  availableBalance?: number | null;
  currentBalance?: number | null;
  institutionValue?: number | null;
  lastSyncedAt?: Date;
}

export interface NormalizedHolding {
  providerAccountId: string;
  securityId?: string | null;
  symbol?: string | null;
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
  value?: number | null;
  costBasis?: number | null;
  asOf?: Date;
  metadata?: Record<string, unknown>;
}

export interface NormalizedTransaction {
  id: string;
  providerAccountId: string;
  description: string;
  amount: number;
  date: Date | string;
  category?: string | null;
  status?: string | null;
  pending?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FetchTransactionsResult {
  transactions: Array<NormalizedTransaction>;
  removed?: Array<string>;
  nextCursor?: string | null;
}

export interface IntegrationProvider {
  id: ProviderIdentifier;
  createLinkToken(request: LinkTokenRequest): Promise<LinkTokenResponse>;
  exchangePublicToken(publicToken: string): Promise<TokenExchangeResponse>;
  fetchAccounts(connection: InstitutionConnection): Promise<Array<NormalizedAccount>>;
  fetchHoldings(connection: InstitutionConnection): Promise<Array<NormalizedHolding>>;
  fetchTransactions(
    connection: InstitutionConnection,
    options?: { cursor?: string | null; startDate?: Date; endDate?: Date },
  ): Promise<FetchTransactionsResult>;
}
