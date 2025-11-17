import express from 'express';
import { getAccountInfo, getAccountLines } from '../components/xrpl';

const router = express.Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* XRPL Account Info Endpoint
// Retrieves account information from the XRPL network
// Example: GET /api/xrpl/account/rHb9C...
// Response: { success: true, data: { ...accountInfo } }
*/
router.get('/xrpl/account/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const accountInfo = await getAccountInfo(address);
    res.json({
      success: true,
      data: accountInfo,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve account info: ${errorMessage}`,
    });
  }
});

router.get('/njp/balance/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const currency = 'NJP';
    const response = await getAccountLines(address);
    const trustlines = response.result.lines;

    for(const line of trustlines) {
        // if(line.currency === currency){
        if(line.currency === currency && line.account === process.env.SYSTEM_ADDRESS){
            res.json({
              success: true,
              data: line,
            });
            return ;
        }
    }
    res.json({
      success: false,
      data: "",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to retrieve account info: ${errorMessage}`,
    });
  }
});


export default router;