import express from "express";
import * as xrpl from "xrpl";
import { getAccountBalances } from "../components/xrpl";

const router = express.Router();

router.get("/balances/:address", async (req, res) => {
  const { address } = req.params;

  if (!xrpl.isValidClassicAddress(address)) {
    return res.status(400).json({
      success: false,
      error: "Invalid XRPL classic address.",
    });
  }

  try {
    const balances = await getAccountBalances(address);
    return res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    console.error("[BACKEND] Failed to get account balances:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: msg,
    });
  }
});

export default router;
