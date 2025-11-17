import * as xrpl from "xrpl";
import dotenv from "dotenv";
import {
  TARGET_TRUSTLINE_CURRENCIES,
  TrustlineInfo,
} from "@repo/utils";
dotenv.config();

const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT!;
if (!XRPL_ENDPOINT) {
  throw new Error("XRPL_ENDPOINT is not defined in the environment variables.");
}
console.log(`Using XRPL endpoint: ${XRPL_ENDPOINT}`);

// Helper to create a new client per request
function createClient() {
  return new xrpl.Client(XRPL_ENDPOINT);
}

// 発行体アドレス（NJP / XJP）
const SYSTEM_ADDRESS = process.env.SYSTEM_ADDRESS;
const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS;

// XRP 残高の型
export interface XrpBalance {
  currency: "XRP";
  value: string; // 単位: XRP
}

// 発行通貨の残高の型
export interface IssuedCurrencyBalance {
  currency: string;
  issuer: string;
  value: string; // 単位: 発行通貨（例: NJP）
}

// アカウント全体の残高情報
export interface AccountBalances {
  address: string;
  xrp: XrpBalance;
  issued: IssuedCurrencyBalance[];
}

// パス探索の結果を返す
export interface ExchangePathResult {
  paths: xrpl.Path[];          // 計算されたパス
  sendMaxAmount: string;       // スリッページ込みのSendMax値
  strictSourceAmount: number;  // 厳密な '必要額'
}

/* Retrieves account information from the XRPL network
// Example usage:
// const accountInfo = await getAccountInfo('rHb9C...');
// console.log(accountInfo);
*/
export async function getAccountInfo(address: string) {
  const client = createClient();
  await client.connect();
  try {
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get account info: ${errorMessage}`);
  } finally {
    await client.disconnect();
  }
}

/**
 * 指定アドレスの保有通貨（XRP + 発行通貨（NJP/XJP））を取得
 * @param address 
 * @returns 
 */
export async function getAccountBalances(address: string): Promise<AccountBalances> {
  const client = createClient();
  await client.connect();

  try {
    // XRP残高（drops）取得
    const accountInfoResponse = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated" as const,
    });

    type AccountInfoResult = {
      account_data: { Balance: string };
    };

    const accountInfoResult = accountInfoResponse.result as AccountInfoResult;
    const xrpBalanceDrops = accountInfoResult.account_data.Balance;

    // --- 発行通貨の残高取得（account_lines） ---
    const accountLinesResponse = await client.request({
      command: "account_lines",
      account: address,
      ledger_index: "validated" as const,
    });

    type AccountLinesResult = {
      lines: { currency: string; account: string; balance: string }[];
    };

    const accountLinesResult = accountLinesResponse.result as AccountLinesResult;
    const lines = accountLinesResult.lines;

    // .env の発行体（NJP / XJP）が設定されていればそれだけに絞る
    const issuedBalances: IssuedCurrencyBalance[] = lines
      .filter((line) => {
        if (!SYSTEM_ADDRESS && !ISSUER_ADDRESS) {
          // フィルタ条件がなければ全部返す
          return true;
        }

        const isKnownIssuer =
          (SYSTEM_ADDRESS && line.account === SYSTEM_ADDRESS) ||
          (ISSUER_ADDRESS && line.account === ISSUER_ADDRESS);

        return isKnownIssuer;
      })
      .map((line) => ({
        currency: line.currency,
        issuer: line.account,
        value: line.balance,
      }));

    return {
      address,
      xrp: {
        currency: "XRP",
        value: dropsToXrp(xrpBalanceDrops),
      },
      issued: issuedBalances,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get account balances: ${errorMessage}`);
  } finally {
    await client.disconnect();
  }
}

/**
 * 指定アドレスのトラストライン情報を取得
 * @param address 
 * @returns 
 */
export async function getAccountTrustlines(address: string): Promise<{
  address: string;
  trustlines: TrustlineInfo[];
}> {
  const client = createClient();
  await client.connect();
  
  try {
    const response = await client.request({
      command: "account_lines",
      account: address,
      ledger_index: "validated" as const,
    });

    const lines = (response.result as any).lines as {
      currency: string;
      account: string; // issuer
      balance: string;
      limit: string;
    }[];

    // 通貨コードで NJP のみフィルタ
    const trustlines: TrustlineInfo[] = lines
      .filter((line) => TARGET_TRUSTLINE_CURRENCIES.includes(line.currency as any))
      .map((line) => ({
        currency: line.currency,
        issuer: line.account,
        balance: line.balance,
        limit: line.limit,
      }));

    return {
      address,
      trustlines,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get account trustlines: ${errorMessage}`);
  } finally {
    await client.disconnect();
  }
}

/**
 * 指定された通貨ペアの交換パスを探索し、最適なパスとSendMaxを返す
 * @param fromAddress 
 * @param fromCurrency 
 * @param fromIssuer 
 * @param toCurrency 
 * @param toIssuer 
 * @param toAmount 
 * @param slippageRate 
 * @returns 
 */
export async function findBestExchangePath(
  fromAddress: string,
  fromCurrency: string,
  fromIssuer: string | undefined,
  toCurrency: string,
  toIssuer: string,
  toAmount: string,
  slippageRate: number = 1.05
): Promise<ExchangePathResult> {
  console.log("[XRPL] Initializing client for path finding...");

  const client = createClient();
  await client.connect();
  console.log("[XRPL] Connected.");

  try {
    console.log(`[XRPL] Finding paths from ${fromCurrency} to ${toCurrency} (${toAmount})`);

    // リクエストデータの構築
    const pathRequest: xrpl.RipplePathFindRequest = {
      command: "ripple_path_find",
      source_account: fromAddress,
      source_currencies: [{
        currency: fromCurrency,
        ...(fromIssuer ? { issuer: fromIssuer } : {}), // XRPの場合はundefinedでも可、通貨によっては必須
      }],
      destination_account: fromAddress, // 交換なので自分宛て
      destination_amount: {
        currency: toCurrency,
        issuer: toIssuer,
        value: toAmount
      }
    };

    console.log("[XRPL] Sending path_find request:", JSON.stringify(pathRequest, null, 2));
    const pathResult = await client.request(pathRequest);
    console.log("[XRPL] Request finished. Result:", JSON.stringify(pathResult.result, null, 2));
    console.log("[XRPL] Request finished. Result(alternatives):", JSON.stringify(pathResult.result.alternatives, null, 2));

    const foundPaths = (pathResult.result as any).alternatives;

    if (!foundPaths || foundPaths.length === 0) {
      console.error("[XRPL] Path finding returned success but alternatives are empty.");
      throw new Error("有効な交換パスが見つかりませんでした (No Paths Found)");
    }

    // 最適なパス（通常は先頭）を選択
    console.log(`[XRPL] Found ${foundPaths.length} paths.`);
    const bestPath = foundPaths[0];

    // 厳密な必要額を取得 (source_amount)
    // source_amount は string (XRP drops) または object (Issued Currency) の場合がある
    let strictVal: number;
    if (typeof bestPath.source_amount === 'string') {
      // XRP (drops) の場合
      strictVal = parseFloat(bestPath.source_amount) / 1000000;
    } else {
      strictVal = parseFloat(bestPath.source_amount.value);
    }

    // スリッページ計算
    const bufferedVal = (strictVal * slippageRate).toFixed(6);

    console.log(`[XRPL] Path found. Strict: ${strictVal}, Buffered(Max): ${bufferedVal}`);

    return {
      paths: bestPath.paths_computed,
      sendMaxAmount: bufferedVal,
      strictSourceAmount: strictVal
    };
  } catch (error) {
    console.error("[XRPL ERROR] Error in findBestExchangePath:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Path finding failed: ${errorMessage}`);
  } finally {
    await client.disconnect();
    console.log("[XRPL] Disconnected.");
  }
}

/**
 * UI表示用：drops → XRP 変換
 * @param drops 
 * @returns 
 */
function dropsToXrp(drops: string): string {
  const numeric = Number(drops);
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid drops value: ${drops}`);
  }
  const xrpValue = numeric / 1_000_000;
  return xrpValue.toString();
}