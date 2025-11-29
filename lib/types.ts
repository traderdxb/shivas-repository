import { ChatRequestOptions as BaseChatRequestOptions } from 'ai';

export interface ChatRequestOptions extends BaseChatRequestOptions {
  experimental_deepResearch?: boolean;
}

export const ASSET_TYPES = ['equity', 'etf', 'cash', 'savings'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const PERFORMANCE_WINDOWS = [
  '1d',
  '1w',
  '1m',
  '3m',
  '6m',
  '1y',
  '3y',
  '5y',
  '10y',
  'since_inception',
] as const;
export type PerformanceWindow = (typeof PERFORMANCE_WINDOWS)[number];

export const TRADE_TYPES = [
  'buy',
  'sell',
  'dividend',
  'interest',
  'transfer',
  'fee',
] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

export const SYNC_STATUSES = ['pending', 'running', 'success', 'failed'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CONNECTION_STATUSES = ['pending', 'linked', 'revoked', 'error'] as const;
export type InstitutionConnectionStatus = (typeof CONNECTION_STATUSES)[number];
