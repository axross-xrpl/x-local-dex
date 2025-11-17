import express from 'express';
import * as xrpl from 'xrpl';
import type { OfferCreate, PermissionedDomainSet } from 'xrpl';
import { permissionedOffer, permissionedDomainSet } from '../components/xrpl';

const router = express.Router();

const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT!;
const SYSTEM_ADDRESS = process.env.SYSTEM_ADDRESS!;

const ISSUER_ADDRESS = process.env.ISSUER_ADDRESS!;
const seed = process.env.ISSUER_SECRET!;

if (!XRPL_ENDPOINT) {
  throw new Error("XRPL_ENDPOINT is not defined in the environment variables.");
}

if (!seed) {
  throw new Error("ISSUER is not defined in the environment variables.");
}

const domainTx: PermissionedDomainSet = {
  TransactionType: "PermissionedDomainSet",
  Account: SYSTEM_ADDRESS,
  DomainID: xrpl.convertStringToHex("test_domain"),
  AcceptedCredentials: [
    {
      Credential: {
        Issuer: SYSTEM_ADDRESS,
        CredentialType: "64656661756C74"
      }
    }
  ],
  // ...other fields as needed
};



const offerTx: OfferCreate = {
  TransactionType: "OfferCreate",
  Account: "rpw4jw1YSdLUzYB3MYAXQkhLdVpPi85M8u",
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
    DomainID:"E25BDC08DBDD24A4DCFEB01F22B4A1A9F50D5021B63D56927B7C4515716B2AB8",
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

router.post('/permissioned-set', async (req, res) => {
  try {
    const result = await permissionedDomainSet(domainTx, seed);
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