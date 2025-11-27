import {
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
  TransactionsSyncRequest,
} from 'plaid';

import type {
  FetchTransactionsResult,
  IntegrationProvider,
  NormalizedAccount,
  NormalizedHolding,
  NormalizedTransaction,
  ProviderIdentifier,
} from './base';
import type { InstitutionConnection } from '@/lib/db/schema';

const plaidEnv = (process.env.PLAID_ENV ?? 'sandbox').toLowerCase() as keyof typeof PlaidEnvironments;

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] ?? PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID ?? '',
      'PLAID-SECRET': process.env.PLAID_SECRET ?? '',
    },
  },
});

const client = new PlaidApi(configuration);

function ensureCredentials() {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    throw new Error('Plaid credentials are not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET.');
  }
}

async function fetchAccountsInternal(
  connection: InstitutionConnection,
): Promise<Array<NormalizedAccount>> {
  if (!connection.accessToken) {
    throw new Error('Connection is missing access token');
  }

  const response = await client.accountsGet({ access_token: connection.accessToken });
  const now = new Date();

  return response.data.accounts.map((acct) => ({
    id: acct.account_id,
    name: acct.name ?? acct.official_name ?? 'Account',
    officialName: acct.official_name ?? null,
    mask: acct.mask ?? null,
    type: acct.type ?? null,
    subtype: acct.subtype ?? null,
    currency: acct.balances?.iso_currency_code ?? acct.balances?.limit_currency_code ?? 'USD',
    availableBalance: acct.balances?.available ?? null,
    currentBalance: acct.balances?.current ?? null,
    institutionValue: acct.balances?.current ?? null,
    lastSyncedAt: now,
  }));
}

async function fetchHoldingsInternal(
  connection: InstitutionConnection,
): Promise<Array<NormalizedHolding>> {
  if (!connection.accessToken) {
    return [];
  }

  const response = await client.investmentsHoldingsGet({
    access_token: connection.accessToken,
  });

  const securityMap = new Map(
    response.data.securities?.map((security) => [security.security_id, security]) ?? [],
  );

  return response.data.holdings.map((holding) => {
    const security = securityMap.get(holding.security_id);
    const asOfDate =
      holding.institution_price_as_of || security?.close_price_as_of
        ? new Date(holding.institution_price_as_of ?? security?.close_price_as_of ?? new Date())
        : new Date();

    return {
      providerAccountId: holding.account_id,
      securityId: holding.security_id,
      symbol: security?.ticker_symbol ?? security?.name ?? null,
      name: security?.name ?? null,
      quantity: holding.quantity ?? null,
      price: holding.price ?? holding.institution_price ?? null,
      value:
        holding.quantity && (holding.price ?? holding.institution_price)
          ? holding.quantity * (holding.price ?? holding.institution_price)
          : null,
      costBasis: holding.cost_basis ?? null,
      asOf: asOfDate,
      metadata: {
        institution_price: holding.institution_price,
        institution_price_as_of: holding.institution_price_as_of,
        price_source: holding.price_source,
      },
    } satisfies NormalizedHolding;
  });
}

async function fetchTransactionsInternal(
  connection: InstitutionConnection,
  cursor?: string | null,
): Promise<FetchTransactionsResult> {
  if (!connection.accessToken) {
    return { transactions: [], removed: [], nextCursor: null };
  }

  const transactions: Array<NormalizedTransaction> = [];
  const removed: Array<string> = [];

  let hasMore = true;
  let nextCursor = cursor ?? connection.cursor ?? null;
  let safety = 0;

  while (hasMore && safety < 5) {
    const request: TransactionsSyncRequest = {
      access_token: connection.accessToken,
      count: 100,
    };

    if (nextCursor) {
      request.cursor = nextCursor;
    }

    const response = await client.transactionsSync(request);

    transactions.push(
      ...((response.data.added ?? []).map((txn) => ({
        id: txn.transaction_id,
        providerAccountId: txn.account_id,
        description: txn.name ?? txn.merchant_name ?? 'Transaction',
        amount: txn.amount,
        date: txn.date ? new Date(txn.date) : new Date(),
        category:
          txn.personal_finance_category?.primary ?? txn.category?.[0] ?? txn.payment_channel ?? null,
        status: txn.pending ? 'pending' : 'posted',
        pending: txn.pending ?? false,
        metadata: {
          merchant_name: txn.merchant_name,
          payment_channel: txn.payment_channel,
          personal_finance_category: txn.personal_finance_category,
        },
      } satisfies NormalizedTransaction)) ?? []),
    );

    removed.push(
      ...((response.data.removed ?? []).map((txn) => txn.transaction_id) ?? []),
    );

    hasMore = response.data.has_more ?? false;
    nextCursor = response.data.next_cursor ?? null;
    safety += 1;

    if (!hasMore) {
      break;
    }
  }

  return {
    transactions,
    removed,
    nextCursor,
  };
}

export const plaidProvider: IntegrationProvider = {
  id: 'plaid' satisfies ProviderIdentifier,
  async createLinkToken({ userId, products, webhookUrl }) {
    ensureCredentials();

    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Deep Research',
      language: 'en',
      products:
        products?.map((product) =>
          product === 'investments' ? Products.Investments : Products.Transactions,
        ) ?? [Products.Transactions, Products.Investments],
      country_codes: [CountryCode.Us],
    };

    if (webhookUrl) {
      request.webhook = webhookUrl;
    }

    if (process.env.PLAID_REDIRECT_URI) {
      request.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    const response = await client.linkTokenCreate(request);
    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration ?? undefined,
    };
  },
  async exchangePublicToken(publicToken: string) {
    ensureCredentials();

    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    const response = await client.itemPublicTokenExchange(request);

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  },
  async fetchAccounts(connection) {
    return await fetchAccountsInternal(connection);
  },
  async fetchHoldings(connection) {
    return await fetchHoldingsInternal(connection);
  },
  async fetchTransactions(connection, options) {
    return await fetchTransactionsInternal(connection, options?.cursor ?? null);
  },
};
