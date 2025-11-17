import express from 'express';
import { createPayload, getPayloadStatus } from '@repo/utils/wallet/node';
import { createPaymentTransaction, createPaymentTokenTransaction } from '@repo/utils/wallet/core';
import { findBestExchangePath } from '../components/xrpl';

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

// Create a payment payload
router.post('/payment-njp', async (req, res) => {
  const { fromAddress, toAddress, amount } = req.body;

  const currency = "NJP";
  // const toAddress = process.env.SYSTEM_ADDRESS;
  const issuerAddress = process.env.SYSTEM_ADDRESS;

  if (!toAddress || !issuerAddress) {
    console.error("process.env.SYSTEM_ADDRESS is null");
    return;
  }

  try {
    const paymentTx = createPaymentTokenTransaction(fromAddress, toAddress, currency, issuerAddress, amount);

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

// Create a payment payload
router.post('/payment-njp', async (req, res) => {
  const { fromAddress, toAddress, amount } = req.body;

  const currency = "NJP";
  // const toAddress = process.env.SYSTEM_ADDRESS;
  const issuerAddress = process.env.SYSTEM_ADDRESS;

  if (!toAddress || !issuerAddress) {
    console.error("process.env.SYSTEM_ADDRESS is null");
    return;
  }

  try {
    const paymentTx = createPaymentTokenTransaction(fromAddress, toAddress, currency, issuerAddress, amount);

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

  console.log(`[BACKEND] /exchange called. from: ${fromAddress}, token provided?: ${!!userToken}`);
  if (userToken) {
    console.log(`[BACKEND] Token starts with: ${userToken.substring(0, 10)}...`);
  } else {
    console.log(`[BACKEND] No userToken provided from frontend!`);
  }

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
      // パス（経路）の計算結果
      const pathResult = await findBestExchangePath(
        fromAddress,
        fromCurrency!,
        fromIssuer,
        toCurrency!,
        toIssuer!,
        exchangeAmount.toString()
      );

      console.log("[EXCHANGE DEBUG] pathResult:", pathResult);

      // XJP → NJP（IOU）のPayment トランザクションを構築
      paymentTx = {
        txjson: {
          TransactionType: "Payment" as const,
          Account: fromAddress,
          Destination: fromAddress, // 自分宛て
          Amount: {
            currency: toCurrency,
            issuer: toIssuer,
            value: exchangeAmount.toString(),    // 例: 120 (NJP)
          },
          SendMax: {
            currency: fromCurrency,
            issuer: fromIssuer,
            value: pathResult.sendMaxAmount,     // 例: 100 (XJP)
          },
          // Flags や Pathfinding を細かく制御する場合はここに追記
          Paths: pathResult.paths,
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