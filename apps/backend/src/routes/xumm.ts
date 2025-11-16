import express from 'express';
import {
  createPayload,
  getPayloadStatus
} from '@repo/utils/wallet/node';
import { createPaymentTransaction } from '@repo/utils/wallet/core';

const router = express.Router();

type ExchangeRequestBody = {
  fromAddress?: string;
  toAddress?: string;
  fromCurrency?: string;
  fromIssuer?: string;
  toCurrency?: string;
  toIssuer?: string;
  baseAmount?: string | number;
  rate?: string | number;
  userToken?: string;
};

// Create a payment payload
router.post('/payment', async (req, res) => {
  const { fromAddress, toAddress, amount } = req.body;

  try {
    const amountInDrops = (parseFloat(amount) * 1000000).toString();
    const paymentTx = createPaymentTransaction(fromAddress, toAddress, amountInDrops);

    const payload = await createPayload(paymentTx);

    if (!payload) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment payload'
      });
    }

    res.json({
      success: true,
      data: {
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Payment creation failed: ${errorMessage}`
    });
  }
});

// Get payload status - This is what frontend will poll
router.get('/payload/:uuid', async (req, res) => {
  const { uuid } = req.params;

  try {
    const status = await getPayloadStatus(uuid);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Payload not found'
      });
    }

    // Return the full status object
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get payload status: ${errorMessage}`
    });
  }
});

/**
 * 通貨交換トランザクション用エンドポイント
 */
router.post("/exchange", async (req, res) => {
  const {
    fromAddress,  // ユーザーのアドレス
    toAddress,    // オペレーターのアドレス
    fromCurrency,
    fromIssuer,
    toCurrency,
    toIssuer,
    baseAmount,
    rate,
    userToken
  } = req.body as ExchangeRequestBody;

  try {
    // 必須パラメータチェック
    if (!fromAddress || !toAddress) {
      return res.status(400).json({
        success: false,
        error: "fromAddress and toAddress are required",
      });
    }

    const baseAmountNum =
      typeof baseAmount === "number"
        ? baseAmount
        : parseFloat(String(baseAmount));
    const rateNum =
      typeof rate === "number" ? rate : parseFloat(String(rate));

    if (
      Number.isNaN(baseAmountNum) ||
      Number.isNaN(rateNum) ||
      baseAmountNum <= 0 ||
      rateNum <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "baseAmount and rate must be positive numbers",
      });
    }

    // 交換後金額
    const exchangeAmount = baseAmountNum * rateNum;

    // IOU 交換かどうかの判定
    const isIouExchange = !!fromCurrency && !!fromIssuer && !!toCurrency && !!toIssuer;

    let paymentTx: any;

    if (isIouExchange) {
      // XJP → NJP（IOU）のPaymentを構築
      paymentTx = {
        txjson: {
          TransactionType: "Payment" as const,
          Account: fromAddress,
          Destination: toAddress,
          Amount: {
            currency: toCurrency,
            issuer: toIssuer,
            value: exchangeAmount.toString(),    // 例: 120 (NJP)
          },
          SendMax: {
            currency: fromCurrency,
            issuer: fromIssuer,
            value: baseAmountNum.toString(),     // 例: 100 (XJP)
          },
          // Flags や Pathfinding を細かく制御する場合はここに追記
          // Flags: 0,
        },
      };
    } else {
      // XRP → dropsのPaymentを構築
      const amountInDrops = Math.round(exchangeAmount * 1_000_000).toString();
      paymentTx = createPaymentTransaction(
        fromAddress,
        toAddress,
        amountInDrops,
      );
    }

    console.log("[EXCHANGE DEBUG] paymentTx:", JSON.stringify(paymentTx, null, 2));

    const payload = await createPayload(paymentTx, userToken ? { userToken } : undefined,);

    if (!payload) {
      return res.status(500).json({
        success: false,
        error: "Failed to create exchange payload",
      });
    }

    return res.json({
      success: true,
      data: {
        uuid: payload.uuid,
        qrUrl: payload.refs.qr_png,
        deepLink: payload.next.always,
        fromAddress,
        toAddress,
        baseAmount: baseAmountNum,
        rate: rateNum,
        exchangeAmount,
        // 必要なら fromCurrency / toCurrency もここで返す
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: `Failed to create exchange payload: ${errorMessage}`,
    });
  }
});

export default router;