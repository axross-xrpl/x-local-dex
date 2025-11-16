import express from "express";
import * as xrpl from "xrpl";
import { getAccountTrustlines } from "../components/xrpl";
import { createPayload } from "@repo/utils/wallet/node";
import type { TrustlineInfo } from "@repo/utils";
import type { TransactionPayload } from "@repo/utils/wallet/core";

const router = express.Router();

/**
 * 指定アドレスに NJP のトラストラインが設定されているかを確認
 */
router.get("/trustlines/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!xrpl.isValidClassicAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid XRPL address format",
      });
    }

    console.log("[BACKEND] Fetching trustlines for account:", address);

    const { trustlines } = await getAccountTrustlines(address);

    // 現段階では NJP のみ
    const hasNJP = trustlines.some(
      (t: TrustlineInfo) => t.currency === "NJP",
    );

    return res.json({
      success: true,
      data: {
        address,
        hasNJP,
        trustlines,
      },
    });
  } catch (error) {
    console.error("[BACKEND] Error fetching trustlines:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch trustlines",
    });
  }
});

/**
 * トランザクション用の XUMM ペイロードを作成
 */
router.post("/trustlines/payload", async (req, res) => {
  try {
    const { address, currency, issuer, limit, userToken } = req.body as {
      address?: string;
      currency?: string; // 現段階では "NJP" 前提
      issuer?: string;
      limit?: string | number;
      userToken?: string;
    };

    if (!address || !currency || !issuer || limit === undefined) {
      return res.status(400).json({
        success: false,
        error: "address, currency, issuer and limit are required",
      });
    }

    if (!xrpl.isValidClassicAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid account address format",
      });
    }
    if (!xrpl.isValidClassicAddress(issuer)) {
      return res.status(400).json({
        success: false,
        error: "Invalid issuer address format",
      });
    }

    const limitNum =
      typeof limit === "number" ? limit : parseFloat(String(limit));
    if (Number.isNaN(limitNum) || limitNum <= 0) {
      return res.status(400).json({
        success: false,
        error: "limit must be a positive number",
      });
    }

    console.log("[BACKEND] Creating TrustSet payload:", {
      address,
      currency,
      issuer,
      limit: limitNum,
      hasUserToken: !!userToken,
    });

    // TrustSet トランザクションの txjson を構築
    const txPayload: TransactionPayload = {
      txjson: {
        TransactionType: "TrustSet" as const,
        Account: address,
        LimitAmount: {
          currency,
          issuer,
          value: limitNum.toString(),
        },
        // 必要に応じて Flags を追加
        // Flags: xrpl.TrustSetFlags.tfClearNoRipple,
      },
    };

    const payload = await createPayload(txPayload, userToken ? { userToken } : undefined,);

    if (!payload) {
      return res.status(500).json({
        success: false,
        error: "Failed to create trustline payload",
      });
    }

    return res.json({
      success: true,
      data: {
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
        address,
        currency,
        issuer,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("[BACKEND] Error creating trustline payload:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create trustline payload",
    });
  }
});

export default router;