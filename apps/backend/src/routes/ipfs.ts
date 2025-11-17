import express from 'express';
import { uploadJsonToIpfs, getUrl } from '@repo/utils';

const router = express.Router();

// Combined endpoint: Upload and get URL in one call
router.post('/upload', async (req, res) => {
  const { jsonData } = req.body;
  
  try {
    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid JSON data is required'
      });
    }

    const pinataJwt = process.env.PINATA_JWT;
    if (!pinataJwt) {
      return res.status(500).json({
        success: false,
        error: 'PINATA_JWT not configured'
      });
    }

    // Upload JSON
    const cid = await uploadJsonToIpfs(jsonData, pinataJwt);
    
    // Get URL
    const url = await getUrl(cid, pinataJwt);

    res.json({
      success: true,
      data: {
        cid,
        url,
        message: 'JSON uploaded to IPFS and URL retrieved successfully'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('IPFS upload and URL retrieval error:', error);
    res.status(500).json({
      success: false,
      error: `Operation failed: ${errorMessage}`
    });
  }
});

export default router;