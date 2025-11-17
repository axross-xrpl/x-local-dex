import express from 'express';
import * as xrpl from 'xrpl';
import type { OfferCreate } from 'xrpl';
import { permissionedOffer } from '../components/xrpl';

const router = express.Router();

const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT!;
const SYSTEM_ADDRESS = process.env.SYSTEM_ADDRESS!;

const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS!;
const seed = process.env.SYSTEM_SECRET!;

if (!XRPL_ENDPOINT) {
  throw new Error("XRPL_ENDPOINT is not defined in the environment variables.");
}

if (!seed) {
  throw new Error("ISSUER is not defined in the environment variables.");
}



const offerTx: OfferCreate = {
  TransactionType: "OfferCreate",
  Account: SYSTEM_ADDRESS,
  TakerPays: {
    currency: "XJP",
    issuer: SYSTEM_ADDRESS,
    value: "10"
  },
  TakerGets: {
    currency: "NJP",
    issuer: ISSUER_ADDRESS,
    value: "5"
    },
    DomainID:xrpl.convertStringToHex(SYSTEM_ADDRESS),
  // ...other fields as needed
};


router.post('/permissioned-offer', async (req, res) => {
  try {
    const result = await permissionedOffer(offerTx, seed);
    console.log("Permissioned offer result:", result);
    res.json({
        success: true,
        data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
        success: false,
        error: `Permissioned offer failed: ${errorMessage}`
    });
  }
});

export default router;