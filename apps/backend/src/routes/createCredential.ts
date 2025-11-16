import express from 'express';
import * as xrpl from 'xrpl';
import { 
  getPayloadStatus 
} from '@repo/utils/wallet/node';
import type { CredentialMetadata } from '@repo/utils/wallet/core';

const router = express.Router();

// Environment variable for system account seed
const SYSTEM_ACCOUNT_SEED = process.env.SYSTEM_SECRET || '';
const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT!;

// Get system issuer address
router.get('/system/issuer', async (req, res) => {
  try {
    if (!SYSTEM_ACCOUNT_SEED) {
      return res.status(500).json({
        success: false,
        error: 'System account not configured'
      });
    }

    const wallet = xrpl.Wallet.fromSeed(SYSTEM_ACCOUNT_SEED);
    
    res.json({
      success: true,
      issuer: wallet.address
    });
  } catch (error) {
    console.error('[BACKEND] Error getting system issuer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system issuer'
    });
  }
});

/*
// Create a credential directly using system account
// This endpoint creates and submits the CredentialCreate transaction directly
// from the system account without user interaction.
// Usage: For backend-initiated credentials.
// POST /api/credential
// Body: { subject, credentialType, expire?, metadata? }
// Returns: { success, txHash?, error? }
*/
router.post('/credential', async (req, res) => {
  try {
    const { 
      subject, 
      credentialType, 
      uri, // Expect hex-encoded URI from frontend
      expire,
      metadata 
    } = req.body;

    // Validate system account seed
    if (!SYSTEM_ACCOUNT_SEED) {
      return res.status(500).json({
        success: false,
        error: 'System account seed not configured'
      });
    }

    // Validate required fields
    if (!subject || !credentialType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, credentialType'
      });
    }

    // Validate XRPL address format
    const xrplAddressRegex = /^r[a-zA-Z0-9]{24,34}$/;
    if (!xrplAddressRegex.test(subject)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subject address format'
      });
    }

    console.log('[CREDENTIAL-CREATE] Creating credential');
    console.log('[CREDENTIAL-CREATE] Subject:', subject);
    console.log('[CREDENTIAL-CREATE] CredentialType (hex):', credentialType);
    console.log('[CREDENTIAL-CREATE] URI (hex):', uri);

    // Decode for logging
    if (credentialType) {
      try {
        const decoded = Buffer.from(credentialType, 'hex').toString('utf8');
        console.log('[CREDENTIAL-CREATE] CredentialType (decoded):', decoded);
      } catch (e) {
        console.log('[CREDENTIAL-CREATE] Could not decode CredentialType');
      }
    }

    if (uri) {
      try {
        const decoded = Buffer.from(uri, 'hex').toString('utf8');
        console.log('[CREDENTIAL-CREATE] URI (decoded):', decoded);
      } catch (e) {
        console.log('[CREDENTIAL-CREATE] Could not decode URI');
      }
    }

    // Connect to XRPL
    const client = new xrpl.Client(XRPL_ENDPOINT);
    await client.connect();

    try {
      // Get wallet from seed
      const wallet = xrpl.Wallet.fromSeed(SYSTEM_ACCOUNT_SEED);

      // Build CredentialCreate transaction
      const txjson: any = {
        TransactionType: 'CredentialCreate',
        Account: wallet.address,
        Subject: subject,
        CredentialType: credentialType, // Already in hex from frontend
      };

      // Add URI if provided (already in hex)
      if (uri) {
        txjson.URI = uri; // Already hex-encoded from frontend
        console.log('[CREDENTIAL-CREATE] URI field added to transaction');
      }

      // Add optional expire
      if (expire) {
        txjson.Expiration = expire;
      }

      console.log('[CREDENTIAL-CREATE] Transaction:', JSON.stringify(txjson, null, 2));

      // Prepare transaction
      const prepared = await client.autofill(txjson);
      console.log('[CREDENTIAL-CREATE] Transaction prepared with fee:', prepared.Fee);

      // Sign transaction
      const signed = wallet.sign(prepared);
      console.log('[CREDENTIAL-CREATE] Transaction signed');

      // Submit transaction
      const result = await client.submitAndWait(signed.tx_blob);

      // Check if transaction was successful
      if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
        const txResult = result.result.meta.TransactionResult;
        
        if (txResult === 'tesSUCCESS') {
          console.log('[CREDENTIAL-CREATE] ✅ Credential created successfully');
          console.log('[CREDENTIAL-CREATE] TX Hash:', result.result.hash);
          
          res.json({
            success: true,
            txHash: result.result.hash,
            account: wallet.address,
            subject: subject,
            credentialType: credentialType,
            uri: uri,
            ledgerIndex: result.result.ledger_index
          });
        } else {
          throw new Error(`Transaction failed: ${txResult}`);
        }
      } else {
        throw new Error('Unable to verify transaction result');
      }
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error('[CREDENTIAL-CREATE] ❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create credential'
    });
  }
});

// Get credential payload status
router.get('/credential/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return res.status(400).json({
        success: false,
        error: 'UUID is required'
      });
    }


    const status = await getPayloadStatus(uuid);

    res.json({
      success: true,
      signed: status.meta.signed,
      txid: status.response?.txid,
      account: status.response?.account,
      dispatched: status.meta.dispatched,
      resolved: status.meta.resolved,
      expired: status.meta.expired
    });
  } catch (error) {
    console.error('[BACKEND] Error getting credential status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get credential status'
    });
  }
});

export default router;