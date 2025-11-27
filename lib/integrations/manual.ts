import type { IntegrationProvider } from './base';

export const manualProvider: IntegrationProvider = {
  id: 'manual',
  async createLinkToken({ userId }) {
    return {
      linkToken: `manual-${userId}-${Date.now()}`,
    };
  },
  async exchangePublicToken(publicToken: string) {
    return {
      accessToken: publicToken,
    };
  },
  async fetchAccounts() {
    return [];
  },
  async fetchHoldings() {
    return [];
  },
  async fetchTransactions() {
    return {
      transactions: [],
      removed: [],
      nextCursor: null,
    };
  },
};
