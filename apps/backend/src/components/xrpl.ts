import * as xrpl from "xrpl";
import dotenv from "dotenv";
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
const ISSUER_NJP_ADDRESS = process.env.ISSUER_NJP_ADDRESS;
const ISSUER_XJP_ADDRESS = process.env.ISSUER_XJP_ADDRESS;

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
        if (!ISSUER_NJP_ADDRESS && !ISSUER_XJP_ADDRESS) {
          // フィルタ条件がなければ全部返す
          return true;
        }

        const isKnownIssuer =
          (ISSUER_NJP_ADDRESS && line.account === ISSUER_NJP_ADDRESS) ||
          (ISSUER_XJP_ADDRESS && line.account === ISSUER_XJP_ADDRESS);

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