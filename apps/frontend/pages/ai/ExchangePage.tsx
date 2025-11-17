import { useEffect, useState, useRef } from "react"
import { WoodenButton } from "@repo/ui"
import { useNavigate } from "react-router-dom"
import { connectWallet, isWalletConnected, getCurrentWalletAddress } from '@repo/utils/wallet/browser';

interface Currency {
  name: string
  amount: number
  symbol: string
}

interface Certificate {
  code: string
  date: string
  credentialType: string
  issuer: string
  rate?: number
}

// 定数
const USER_TOKEN = "NJP" // TODO: 必要に応じてContext等から取得
const XJP_ISSUER = "rEe8Yj3hfGpa3nGypC1MJoV7B99Hz3i8at"
const NJP_ISSUER = "rGrGdaArjMRB8dsfwxsH3L87gmqiaK4gQo"
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL!
const POLL_INTERVAL_MS = 3000

export default function ExchangePage() {
  const router = useNavigate()

  // ユーザーアドレスをState管理 (初期値 null)
  const [userAddress, setUserAddress] = useState<string | null>(null)

  // 保有通貨（初期値は0、実際の残高は fetchBalances で上書き）
  const [currencies, setCurrencies] = useState<Currency[]>([
    { name: "日本円", amount: 0, symbol: "¥" },
    { name: "ドル", amount: 0, symbol: "$" },
    { name: "地元通貨", amount: 0, symbol: "NJP" },
  ])

  // 入力＆レート
  const [exchangeAmount, setExchangeAmount] = useState("")
  const [exchangeRate, setExchangeRate] = useState(1.0)

  // 証明書
  const [showCertificates, setShowCertificates] = useState(false)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)

  // トラストライン
  const [hasNJPTrustline, setHasNJPTrustline] = useState<boolean | null>(null)
  const [hasXJPTrustline, setHasXJPTrustline] = useState<boolean | null>(null)

  // 状態＆メッセージ
  const [message, setMessage] = useState("")
  const [hasReceivedBonus, setHasReceivedBonus] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // XAMAN ペイロード
  const pollingRef = useRef<number | null>(null)

  // unmount 時にポーリング停止
  useEffect(() => {
    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current)
      }
    }
  }, [])

  // 初期化：ウォレット接続確認
  useEffect(() => {
    const initWallet = async () => {
      try {
        const connected = await isWalletConnected();
        if (connected) {
          const address = await getCurrentWalletAddress();
          if (address) {
            setUserAddress(address);
          }
        } else {
          // 未接続時に自動接続を試みる場合はここで connectWallet() を呼びだす
          // 今回は画面表示を優先するため何もしない
        }
      } catch (error) {
        console.error("Wallet initialization failed:", error);
      }
    };
    initWallet();
  }, []);

  // データ取得 (userAddress がセットされたら実行)
  useEffect(() => {
    if (!userAddress) return

    const fetchAll = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchBalances(userAddress),
          fetchTrustlines(userAddress),
          fetchCertificates(userAddress),
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [userAddress])

  // 手動接続用
  const handleConnectWallet = async () => {
    try {
      const walletState = await connectWallet();
      if (walletState.isConnected && walletState.address) {
        setUserAddress(walletState.address);
        setMessage("ウォレットを接続しました ✅");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setMessage("ウォレットの接続に失敗しました");
    }
  };

  // 残高取得（/api/balances/:address）
  const fetchBalances = async (address: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/balances/${address}`)
      const json = await res.json()
      if (!json.success) {
        console.error("Failed to fetch balances:", json.error)
        return
      }

      const data = json.data as {
        address: string
        xrp: { currency: string; value: string }
        issued: { currency: string; issuer: string; value: string }[]
      }

      // XJP = 日本円ステーブルコイン
      const xjp = data.issued.find((i) => i.currency === "XJP" && i.issuer === XJP_ISSUER,)
      const xjpBalance = xjp ? Number(xjp.value) : 0

      // NJP
      const njp = data.issued.find((i) => i.currency === "NJP" && i.issuer === NJP_ISSUER,)
      const njpBalance = njp ? Number(njp.value) : 0

      setCurrencies([
        { name: "日本円", amount: xjpBalance, symbol: "¥" },
        { name: "ドル", amount: 300, symbol: "$" }, // デモ用
        { name: "地元通貨", amount: njpBalance, symbol: "NJP" },
      ])
    } catch (e) {
      console.error("Error fetching balances:", e)
    }
  }

  // トラストライン取得（GET /api/trustlines/:address）
  const fetchTrustlines = async (address: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/trustlines/${address}`)
      const json = await res.json()
      if (!json.success) {
        console.error("Failed to fetch trustlines:", json.error)
        return
      }

      const data = json.data as {
        address: string
        hasNJP: boolean
        hasXJP: boolean
        trustlines: { currency: string; issuer: string; balance: string; limit: string }[]
      }

      setHasNJPTrustline(data.hasNJP)
      setHasXJPTrustline(data.hasXJP)
    } catch (e) {
      console.error("Error fetching trustlines:", e)
    }
  }

  // 証明書一覧取得（GET /api/credentials/:address）
  const fetchCertificates = async (address: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/credentials/${address}`)
      const json = await res.json()
      if (!json.success) {
        console.error("Failed to fetch credentials:", json.error)
        return
      }

      const data = json as {
        success: boolean
        account: string
        count: number
        credentials: {
          credentialType: string
          issuer: string
          metadata: {
            name: string
            expireDate: string
            type?: string
            location: string
            rate: number
          } | null
        }[]
      }

      console.log("[Exchange.tsx] 生の credentials：", data.credentials);
      console.log(
        "[Exchange.tsx] metadata 一覧：",
        data.credentials.map((c) => c.metadata)
      );

      const mapped: Certificate[] = data.credentials
        .filter((c) => c.metadata)
        .map((c) => ({
          code: c.metadata!.name || c.credentialType,
          date: c.metadata!.expireDate || "-",
          credentialType: c.credentialType,
          issuer: c.issuer,
          rate: c.metadata!.rate,
        }))

      console.log("[Exchange.tsx] credentials 情報：", mapped);
      setCertificates(mapped)
    } catch (e) {
      console.error("Error fetching credentials:", e)
    }
  }

  // 証明書選択 → レート決定（/api/rate/apply）
  const handleCertificateSelect = async (cert: Certificate) => {
    if (!userAddress) {
      setMessage("ウォレットが接続されていません");
      return;
    }

    setSelectedCertificate(cert)
    setShowCertificates(false)
    setMessage("証明書を適用中です...")

    try {
      const res = await fetch(`${API_BASE_URL}/api/rate/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: userAddress,
          credentialType: cert.credentialType,
          issuer: cert.issuer,
        }),
      })

      const json = await res.json()
      if (!json.success) {
        setMessage(`証明書の適用に失敗しました: ${json.error ?? "unknown error"}`)
        return
      }

      const data = json.data as { rate: number }

      setExchangeRate(data.rate)
      setMessage(`証明書「${cert.code}」を適用しました！交換レートが 1:${data.rate} になりました。`)
    } catch (e) {
      console.error("Error applying rate:", e)
      setMessage("証明書の適用中にエラーが発生しました")
    }
  }

  // トラストライン設定用ペイロード作成（POST /api/trustlines/payload）
  const handleSetupTrustline = async () => {
    setMessage("")

    if (!userAddress) {
      setMessage("ウォレットアドレスが取得できませんでした")
      handleConnectWallet()
      return
    }

    if (hasNJPTrustline && hasXJPTrustline) {
      setMessage("すでに NJP & XJP のトラストラインが設定されています")
      return
    }

    try {
      setIsLoading(true)
      if (!hasNJPTrustline) {
        const resNJP = await fetch(`${API_BASE_URL}/api/trustlines/payload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: userAddress,
            currency: "NJP",
            issuer: NJP_ISSUER,
            limit: 1000000000,
            userToken: USER_TOKEN,
            allowRippling: true,
          }),
        })
        const jsonNJP = await resNJP.json()
        if (!jsonNJP.success) {
          setMessage(`NJPトラストライン設定失敗: ${jsonNJP.error ?? "unknown error"}`)
          return
        }
        setMessage("NJPトラストライン設定用トランザクションを作成しました。XAMANで承認してください。")
        startPollingTrustlineStatus(jsonNJP.data.uuid)
      }

      if (!hasXJPTrustline) {
        const resXJP = await fetch(`${API_BASE_URL}/api/trustlines/payload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: userAddress,
            currency: "XJP",
            issuer: XJP_ISSUER,
            limit: 1000000000,
            userToken: USER_TOKEN,
            allowRippling: true,
          }),
        })
        const jsonXJP = await resXJP.json()
        if (!jsonXJP.success) {
          setMessage(`XJPトラストライン設定失敗: ${jsonXJP.error ?? "unknown error"}`)
          return
        }
        setMessage("XJPトラストライン設定用トランザクションを作成しました。XAMANで承認してください。")
        startPollingTrustlineStatus(jsonXJP.data.uuid)
      }

    } catch (e) {
      console.error("Error creating trustline payload:", e)
      setMessage("トラストライン設定中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * トラストライン用のステータス監視
   * @param uuid 
   */
  const startPollingTrustlineStatus = (uuid: string) => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current)
    }

    const id = window.setInterval(async () => {
      if (!userAddress) return;
      try {
        const status = await fetchPayloadStatus(uuid)
        const signed = status?.meta?.signed

        if (signed === true && status?.meta?.resolved === true) {
          // サイン済み → Ledger上の trustline を再取得
          await fetchTrustlines(userAddress)

          setMessage("トラストラインが正常に設定されました ✅")
          window.clearInterval(id)
          pollingRef.current = null
        } else if (status?.meta?.resolved === false) {
          setMessage("トラストライン設定は拒否されました ❌")
          window.clearInterval(id)
          pollingRef.current = null
        }
        // null の間は待つだけ
      } catch (e) {
        console.error(e)
        setMessage("トラストライン設定の承認状況の取得に失敗しました")
        window.clearInterval(id)
        pollingRef.current = null
      }
    }, 3000)

    pollingRef.current = id
  }

  /**
   * ペイロードステータス取得
   * @param uuid 
   * @returns 
   */
  const fetchPayloadStatus = async (uuid: string) => {
    const res = await fetch(`${API_BASE_URL}/api/xumm/payload/${uuid}`)
    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error ?? "Failed to get payload status")
    }
    return json.data
  }

  /**
   * ペイロードステータスをポーリング（承認 / 拒否 まで）
   * @param uuid 
   */
  const startPollingPayloadStatus = (uuid: string) => {
    // 既存の interval があれば止める
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current)
    }

    const id = window.setInterval(async () => {
      if (!userAddress) return;
      try {
        const status = await fetchPayloadStatus(uuid)
        const signed = status?.meta?.signed // true / false / null

        if (signed === true) {
          setMessage("トランザクションが承認されました ✅")

          // 最新残高を取得して画面を上書き
          await fetchBalances(userAddress)

          window.clearInterval(id)
          pollingRef.current = null
        } else if (signed === false) {
          setMessage("トランザクションは拒否されました ❌")
          window.clearInterval(id)
          pollingRef.current = null
        }
        // signed === null の間は待ち続ける
      } catch (e) {
        console.error("Error while polling payload status:", e)
        setMessage("承認ステータスの取得に失敗しました。しばらくしてから再試行してください。")
        window.clearInterval(id)
        pollingRef.current = null
      }
    }, POLL_INTERVAL_MS)

    pollingRef.current = id
  }

  // 通貨交換トランザクション作成（POST /api/xumm/exchange）
  const handleExchange = async () => {
    setMessage("")

    // 既存ポーリング停止
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (!userAddress) {
      setMessage("ウォレットが接続されていません。接続を試みます...")
      handleConnectWallet()
      return
    }

    const amount = Number.parseFloat(exchangeAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      setMessage("有効な金額を入力してください")
      return
    }

    if (!hasNJPTrustline) {
      setMessage("先に NJP のトラストラインを設定してください")
      return
    }

    if (!hasXJPTrustline) {
      setMessage("先に XJP のトラストラインを設定してください")
      return
    }

    if (!userAddress) {
      setMessage("ウォレットアドレスが取得できませんでした")
      return
    }

    try {
      setIsLoading(true)

      const res = await fetch(`${API_BASE_URL}/api/xumm/exchange`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: userAddress,  // 送信元アカウント（ユーザー）
          toAddress: NJP_ISSUER,      // 受け取り側アカウント（NJPの発行者 = SYSTEM_ADDRESS）
          fromCurrency: "XJP",
          fromIssuer: XJP_ISSUER,    // 交換元トークン（XJP）
          toCurrency: "NJP",
          toIssuer: NJP_ISSUER,       // 交換先トークン（NJP）
          baseAmount: amount,         // ベース金額
          rate: exchangeRate,         // レート
          userToken: USER_TOKEN,      // XAMANへのプッシュ通知用
        }),
      })

      const json = await res.json()
      if (!json.success) {
        setMessage(`交換トランザクションの作成に失敗しました: ${json.error ?? "unknown error"}`)
        return
      }

      const data = json.data as {
        uuid: string
        qrUrl: string
        deepLink: string
        fromAddress: string
        toAddress: string
        baseAmount: number
        rate: number
        exchangeAmount: number
      }

      setMessage("交換トランザクションを作成しました。XAMAN アプリに通知を送信しました。承認をお願いします。")

      if (!hasReceivedBonus) {
        setMessage(
          `交換トランザクションを作成しました！XUMM で承認してください。\n` +
          `今回は初回交換ボーナスとして +1000 NJP（デモ演出）が付与されます。`,
        )
        setHasReceivedBonus(true)
      } else {
        setMessage(
          `交換トランザクションを作成しました！XUMM で承認してください。\n` +
          `交換額の目安: ${data.exchangeAmount.toFixed(0)} NJP 相当`,
        )
      }

      setExchangeAmount("")

      // ポーリング開始（承認/拒否を監視）
      startPollingPayloadStatus(data.uuid)

      // 本当はトランザクション承認後に再取得するひつようがあるが、
      // デモとして「すぐ反映」したい場合はここで再取得
      // await fetchBalances(userAddress)
    } catch (e) {
      console.error("Error creating exchange payload:", e)
      setMessage("交換処理中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-amber-900 font-serif">通貨トレードセンター</h1>
        <p className="text-center text-amber-700 mb-8">お得に地元通貨を手に入れよう！</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側：保有通貨一覧 */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border-4 border-amber-600">
            <h2 className="text-2xl font-bold mb-6 text-amber-900 flex items-center gap-2">
              <span className="text-3xl">💰</span>
              保有通貨
            </h2>
            <div className="space-y-4">
              {currencies.map((currency, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-xl border-2 border-amber-400"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-amber-900">{currency.name}</span>
                    <span className="text-2xl font-bold text-amber-700">
                      {currency.symbol} {currency.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 訪問証明書読み込み */}
            <div className="mt-8">
              <WoodenButton onClick={() => setShowCertificates(!showCertificates)} variant="primary" className="w-full">
                📜 訪問証明書を読み込む
              </WoodenButton>

              {showCertificates && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto bg-amber-50 p-4 rounded-lg border-2 border-amber-300">
                  <p className="text-sm font-semibold text-amber-900 mb-2">証明書を選択してください：</p>
                  {!userAddress && <p className="text-xs text-red-600 mb-2">※ウォレット情報が取得できていません</p>}
                  {certificates.length === 0 && (
                    <p className="text-xs text-amber-600">利用可能な証明書がありません。</p>
                  )}
                  {certificates.map((cert, index) => (
                    <button
                      key={index}
                      onClick={() => handleCertificateSelect(cert)}
                      className="w-full text-left p-3 bg-white hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors"
                    >
                      <div className="font-mono text-sm text-amber-900">
                        <div className="font-bold">{cert.code}</div>
                        <div className="text-xs text-amber-600">発行日: {cert.date}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedCertificate && (
                <div className="mt-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">✓ 適用中の証明書:</p>
                  <p className="font-mono text-sm text-green-900">{selectedCertificate.code}</p>
                  <p className="text-xs text-green-700 mt-1">交換レート: 1:{exchangeRate}（20%お得！）</p>
                </div>
              )}

              {hasNJPTrustline !== null && (
                <div
                  className={`mt-4 p-3 rounded-lg border-2 text-sm ${hasNJPTrustline
                    ? "bg-green-50 border-green-400 text-green-800"
                    : "bg-red-50 border-red-400 text-red-800"
                    }`}
                >
                  {hasNJPTrustline ? "✅ NJP のトラストラインが設定されています。" : "⚠ NJP のトラストラインが未設定です。"}
                </div>
              )}

              {hasXJPTrustline !== null && (
                <div
                  className={`mt-4 p-3 rounded-lg border-2 text-sm ${hasXJPTrustline
                    ? "bg-green-50 border-green-400 text-green-800"
                    : "bg-red-50 border-red-400 text-red-800"
                    }`}
                >
                  {hasXJPTrustline ? "✅ XJP のトラストラインが設定されています。" : "⚠ XJP のトラストラインが未設定です。"}
                </div>
              )}
            </div>
          </div>

          {/* 右側：交換機能 */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 border-4 border-amber-600">
            <h2 className="text-2xl font-bold mb-6 text-amber-900 flex items-center gap-2">
              <span className="text-3xl">🔄</span>
              通貨交換
            </h2>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-400">
                <p className="text-sm text-blue-900 mb-2">交換元</p>
                <p className="text-2xl font-bold text-blue-700">日本円 (¥)</p>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-4xl text-amber-600">⬇️</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-400">
                <p className="text-sm text-green-900 mb-2">交換先</p>
                <p className="text-2xl font-bold text-green-700">地元通貨 (NJP)</p>
                <p className="text-sm text-green-600 mt-2">現在のレート: 1:{exchangeRate}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-900 mb-2">交換する日本円の額</label>
                  <input
                    type="number"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(e.target.value)}
                    placeholder="金額を入力"
                    className="w-full px-4 py-3 text-lg border-2 border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <WoodenButton onClick={handleSetupTrustline} variant="primary" className="w-full text-xl py-4" disabled={isLoading}>
                  🔄️ トラストラインを設定する
                </WoodenButton>

                <WoodenButton onClick={handleExchange} variant="primary" className="w-full text-xl py-4" disabled={isLoading}>
                  💱 交換する
                </WoodenButton>

                {message && (
                  <div className="p-4 bg-amber-100 border-2 border-amber-500 rounded-lg">
                    <p className="text-amber-900 font-semibold text-center">{message}</p>
                  </div>
                )}

                {!hasReceivedBonus && (
                  <div className="p-4 bg-yellow-100 border-2 border-yellow-500 rounded-lg">
                    <p className="text-yellow-900 font-semibold text-center">🎁 初回交換ボーナス1000NJP!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <WoodenButton onClick={() => router("/town-n")} variant="secondary">
            🏠 町に戻る
          </WoodenButton>
        </div>
      </div>
    </div>
  )
}
