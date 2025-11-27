import type { IntegrationProvider, ProviderIdentifier } from './base';
import { manualProvider } from './manual';
import { plaidProvider } from './plaid';

const providers: Record<ProviderIdentifier, IntegrationProvider> = {
  plaid: plaidProvider,
  manual: manualProvider,
};

export function getIntegrationProvider(provider: ProviderIdentifier): IntegrationProvider {
  const implementation = providers[provider];

  if (!implementation) {
    throw new Error(`Unsupported integration provider: ${provider}`);
  }

  return implementation;
}

export const integrationProviders = providers;
