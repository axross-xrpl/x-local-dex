import express from 'express';
import * as xrpl from 'xrpl';
import type { CredentialMetadata } from "@repo/utils/wallet/core";

const router = express.Router();

const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT!;

// Credential flags
const LSF_ACCEPTED = 0x00010000; // 65536

// XRPL から返ってくる Credential オブジェクトの型
interface RawCredentialObject {
  CredentialType: string;
  Issuer: string;
  Subject: string;
  URI?: string;
  Expire?: number;
  Flags: number;
  OwnerNode?: string;
  PreviousTxnID?: string;
  PreviousTxnLgrSeq?: number;
  index: string;
}

/**
 * URIに入っているJSONを、APIで扱いやすい形に正規化
 * @param raw 
 */
function normalizeMetadata(raw: any | null): CredentialMetadata | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const rate = Number(raw.rate);

  return {
    name: raw.name ?? "",
    expireDate: raw["expire-date"] ?? raw.expireDate ?? "",
    type: raw.type ?? undefined,
    location: raw.location ?? "",
    rate: Number.isNaN(rate) ? "1.0" : String(rate),
  };
}

// Get credentials for a given account (only accepted)
router.get('/credentials/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate XRPL address format
    const xrplAddressRegex = /^r[a-zA-Z0-9]{24,34}$/;
    if (!xrplAddressRegex.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid XRPL address format'
      });
    }


    // Connect to XRPL
    const client = new xrpl.Client(XRPL_ENDPOINT);
    await client.connect();

    try {
      // Get account objects (includes credentials)
      const accountObjects = await client.request({
        command: 'account_objects',
        account: address,
        type: 'credential',
        ledger_index: 'validated' as const,
      });


      // Parse and filter only accepted credentials
      const credentials = (accountObjects.result.account_objects as RawCredentialObject[])
        .filter((obj) => {
          // Check if credential is accepted
          const isAccepted = (obj.Flags & LSF_ACCEPTED) === LSF_ACCEPTED;
          return isAccepted;
        })
        .map((obj: any) => {
          // Decode URI if present
          let metadata = null;
          let uriDecoded = null;
          if (obj.URI) {
            try {
              uriDecoded = Buffer.from(obj.URI, 'hex').toString('utf8');
              // If it's a valid JSON, parse it; otherwise, just use the string
              if (uriDecoded.trim().startsWith("{")) {
                metadata = JSON.parse(uriDecoded);
              } else {
                metadata = uriDecoded; // Just a URL or plain string
              }
            } catch (error) {
              console.error('[BACKEND] Failed to decode URI:', error);
              metadata = uriDecoded; // fallback to raw string
            }
          }

          return {
            credentialType: obj.CredentialType,
            issuer: obj.Issuer,
            subject: obj.Subject,
            uri: obj.URI,
            metadata: metadata,
            expire: obj.Expire,
            flags: obj.Flags,
            ownerNode: obj.OwnerNode,
            previousTxnID: obj.PreviousTxnID,
            previousTxnLgrSeq: obj.PreviousTxnLgrSeq,
            index: obj.index
          };
        });


      res.json({
        success: true,
        account: address,
        count: credentials.length,
        credentials: credentials
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error('[BACKEND] Error fetching credentials:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch credentials'
    });
  }
});

// Get specific credential details
router.get('/credential/:address/:credentialType/:issuer', async (req, res) => {
  try {
    const { address, credentialType, issuer } = req.params;

    // Validate XRPL addresses
    const xrplAddressRegex = /^r[a-zA-Z0-9]{24,34}$/;
    if (!xrplAddressRegex.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account address format'
      });
    }
    if (!xrplAddressRegex.test(issuer)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid issuer address format'
      });
    }


    // Connect to XRPL
    const client = new xrpl.Client(XRPL_ENDPOINT);
    await client.connect();

    try {
      // Get account objects
      const accountObjects = await client.request({
        command: 'account_objects',
        account: address,
        type: 'credential',
        ledger_index: 'validated' as const,
      });

      // Find matching credential
      const credential = (accountObjects.result.account_objects as RawCredentialObject[]).find((obj) =>
        obj.CredentialType === credentialType && obj.Issuer === issuer
      );

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      // Check if credential is accepted
      const isAccepted = (credential.Flags & LSF_ACCEPTED) === LSF_ACCEPTED;

      if (!isAccepted) {
        return res.status(404).json({
          success: false,
          error: 'Credential exists but has not been accepted'
        });
      }

      // Decode URI if present
      let metadataRaw: any = null;
      let metadata: CredentialMetadata | null = null;
      if (credential.URI) {
        try {
          const uriDecoded = Buffer.from(credential.URI, 'hex').toString('utf8');
          metadataRaw = JSON.parse(uriDecoded);
          metadata = normalizeMetadata(metadataRaw);
        } catch (error) {
          console.error('[BACKEND] Failed to decode URI:', error);
        }
      }

      res.json({
        success: true,
        credential: {
          credentialType: credential.CredentialType,
          issuer: credential.Issuer,
          subject: credential.Subject,
          uri: credential.URI,
          metadata: metadata,
          expire: credential.Expire,
          flags: credential.Flags,
          ownerNode: credential.OwnerNode,
          previousTxnID: credential.PreviousTxnID,
          previousTxnLgrSeq: credential.PreviousTxnLgrSeq,
          index: credential.index
        }
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error('[BACKEND] Error fetching credential:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch credential'
    });
  }
});

export default router;