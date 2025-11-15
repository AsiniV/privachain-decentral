/// <reference types="@keplr-wallet/types" />

import { Window as KeplrWindow } from '@keplr-wallet/types';

declare global {
  interface Window extends KeplrWindow {}
}

export {};
