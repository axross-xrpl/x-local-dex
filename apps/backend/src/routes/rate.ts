// apps/backend/src/routes/rate.ts
import express from "express";
import * as xrpl from "xrpl";
import type { CredentialMetadata } from "@repo/utils/wallet/core";

const router = express.Router();

const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT!;
if (!XRPL_ENDPOINT) {
  throw new Error("XRPL_ENDPOINT is not defined in the environment variables.");
}

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
 * URI に入っている JSON を、CredentialMetadata に正規化
 * @param raw 
 * @returns 
 */
function normalizeMetadata(raw: any | null): CredentialMetadata | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const rateRaw = raw.rate ?? 1.0;
  const rateNum = Number(rateRaw);
  const rate = Number.isNaN(rateNum) ? 1.0 : rateNum;

  return {
    name: raw.name ?? "",
    expireDate: raw["expire-date"] ?? raw.expireDate ?? "",
    type: raw.type ?? undefined,
    location: raw.location ?? "",
    rate,
  };
}

/**
 * 指定された証明書（credentialType + issuer）にもとづいてレートを決定して返す
 */
router.post("/rate/apply", async (req, res) => {
  try {
    const { address, credentialType, issuer } = req.body as {
      address?: string;
      credentialType?: string;
      issuer?: string;
    };

    // 入力チェック
    if (!address || !credentialType || !issuer) {
      return res.status(400).json({
        success: false,
        error: "address, credentialType and issuer are required",
      });
    }

    // XRPL アドレス形式チェック
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

    console.log("[BACKEND] Applying credential for rate:", {
      address,
      credentialType,
      issuer,
    });

    const client = new xrpl.Client(XRPL_ENDPOINT);
    await client.connect();

    try {
      // アカウントが保有するcredentialオブジェクト一覧を取得
      const accountObjectsResponse = await client.request({
        command: "account_objects",
        account: address,
        type: "credential",
        ledger_index: "validated" as const,
      });

      const accountObjects = (accountObjectsResponse.result as any)
        .account_objects as RawCredentialObject[];

      // 該当credentialを検索
      const credential = accountObjects.find(
        (obj) =>
          obj.CredentialType === credentialType && obj.Issuer === issuer
      );

      if (!credential) {
        return res.status(404).json({
          success: false,
          error: "Credential not found",
        });
      }

      // ACCEPTEDフラグチェック
      const isAccepted =
        (credential.Flags & LSF_ACCEPTED) === LSF_ACCEPTED;
      if (!isAccepted) {
        return res.status(400).json({
          success: false,
          error: "Credential exists but has not been accepted",
        });
      }

      // URIからメタデータを復元
      let metadata: CredentialMetadata | null = null;
      if (credential.URI) {
        try {
          const uriDecoded = Buffer.from(credential.URI, "hex").toString(
            "utf8"
          );
          const metadataRaw = JSON.parse(uriDecoded);
          metadata = normalizeMetadata(metadataRaw);
        } catch (error) {
          console.error("[BACKEND] Failed to decode credential URI:", error);
          return res.status(500).json({
            success: false,
            error: "Failed to decode credential metadata",
          });
        }
      }

      if (!metadata) {
        return res.status(400).json({
          success: false,
          error: "Credential metadata is invalid",
        });
      }

      // レートはmetadata.rateをそのまま採用
      const rate = metadata.rate;

      return res.json({
        success: true,
        data: {
          address,
          credentialType,
          issuer,
          rate,
          metadata,
        },
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("[BACKEND] Error applying credential for rate:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to apply credential for rate",
    });
  }
});

export default router;
