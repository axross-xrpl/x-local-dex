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

    // Validate metadata if provided
    let validatedMetadata: CredentialMetadata | undefined;
    if (metadata) {
      if (!metadata.name || !metadata.type) {
        return res.status(400).json({
          success: false,
          error: 'Metadata must include name and type'
        });
      }
      
      validatedMetadata = {
        name: metadata.name,
        type: metadata.type,
        expireDate: metadata.expireDate,
        location: metadata.location,
        rate: metadata.rate !== undefined ? Number(metadata.rate) : undefined
      };

      // Validate rate if provided
      if (validatedMetadata.rate !== undefined) {
        if (validatedMetadata.rate < 0 || validatedMetadata.rate > 5) {
          return res.status(400).json({
            success: false,
            error: 'Rate must be between 0 and 5'
          });
        }
      }
    }

    console.log('[BACKEND] Creating credential directly from system account');

    // Connect to XRPL
    const client = new xrpl.Client(XRPL_ENDPOINT);
    await client.connect();

    try {
      // Get wallet from seed
      const wallet = xrpl.Wallet.fromSeed(SYSTEM_ACCOUNT_SEED);
      console.log('[BACKEND] System account address:', wallet.address);

      // Build CredentialCreate transaction
      const txjson: any = {
        TransactionType: 'CredentialCreate',
        Account: wallet.address,
        Subject: subject,
        CredentialType: credentialType,
        Expiration: xrpl.unixTimeToRippleTime(Date.now() + 60000) // 1 second into the future
      };

      // Add optional expire
      if (expire) {
        txjson.Expire = expire;
      }

      // Add metadata as URI (hex encoded JSON)
      if (validatedMetadata) {
        const metadataJson = JSON.stringify({
          name: validatedMetadata.name,
          'expire-date': validatedMetadata.expireDate,
          type: validatedMetadata.type,
          location: validatedMetadata.location,
          rate: validatedMetadata.rate
        });
        
        // Convert to hex
        const metadataHex = Buffer.from(metadataJson, 'utf8').toString('hex').toUpperCase();
        txjson.URI = metadataHex;
      }

      console.log('[BACKEND] Transaction JSON:', txjson);

      // Prepare transaction
      const prepared = await client.autofill(txjson);
      console.log('[BACKEND] Prepared transaction:', prepared);

      // Sign transaction
      const signed = wallet.sign(prepared);
      console.log('[BACKEND] Transaction signed:', signed.hash);

      // Submit transaction
      const result = await client.submitAndWait(signed.tx_blob);
      console.log('[BACKEND] Transaction result:', result);

      // Check if transaction was successful
      if (result.result.meta && typeof result.result.meta === 'object' && 'TransactionResult' in result.result.meta) {
        const txResult = result.result.meta.TransactionResult;
        
        if (txResult === 'tesSUCCESS') {
          res.json({
            success: true,
            txHash: result.result.hash,
            account: wallet.address,
            subject: subject,
            credentialType: credentialType,
            metadata: validatedMetadata,
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
    console.error('[BACKEND] Error creating credential:', error);
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

    console.log('[BACKEND] Checking credential payload status:', uuid);

    const status = await getPayloadStatus(uuid);
    console.log('[BACKEND] Payload status:', status);

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