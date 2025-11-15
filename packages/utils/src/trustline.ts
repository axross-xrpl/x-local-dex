export interface TrustlineInfo {
  currency: string; // 例: "NJP", "XJP"
  issuer: string;   // 発行体アドレス
  balance: string;  // 現在残高
  limit: string;    // 設定されている上限値
}

// 現段階では NJP のみ対応
export const TARGET_TRUSTLINE_CURRENCIES = ["NJP"] as const;

export type TargetTrustlineCurrency =
  (typeof TARGET_TRUSTLINE_CURRENCIES)[number];