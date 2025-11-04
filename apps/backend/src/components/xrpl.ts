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