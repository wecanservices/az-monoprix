import type frMessages from "../locales/fr.json";

declare global {
  /** Shape of the translation bundle — inferred from the FR file (source of truth). */
  type IntlMessages = typeof frMessages;
}

export {};
