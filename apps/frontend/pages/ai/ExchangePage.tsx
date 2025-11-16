import { useEffect, useState, useRef } from "react"
import { WoodenButton } from "@repo/ui"
import { useNavigate } from "react-router-dom"

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

// TODO: 実際にはウォレット状態やコンテキストから取得する
const USER_ADDRESS = "rPkaCB9kSNrY4btec6tVSNq3NrPr1LLNAy"

// TODO: 実際の userToken（XAMAN / XUMM連携時に得られる user_token）を取得するように変更する
const USER_TOKEN = "YOUR_XAMAN_USER_TOKEN_HERE"

// TODO: 実際の NJP 発行体アドレスに差し替える
const NJP_ISSUER = "rUCTojT2C1CgA5G4uJMkJDEcXMSvBsS1BN"

// TODO: 環境変数から読む形にしてもOK
const API_BASE_URL = "http://localhost:3001"

const POLL_INTERVAL_MS = 3000

export default function ExchangePage() {
  const router = useNavigate()

  // 保有通貨（デモ用の残高表示）
  const [currencies, setCurrencies] = useState<Currency[]>([
    { name: "日本円", amount: 50000, symbol: "¥" },
    { name: "ドル", amount: 300, symbol: "$" },
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

  // 状態＆メッセージ
  const [message, setMessage] = useState("")
  const [hasReceivedBonus, setHasReceivedBonus] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // XAMAN ペイロード
  // const [payloadUuid, setPayloadUuid] = useState<string | null>(null)
  const pollingRef = useRef<number | null>(null)

  // unmount 時にポーリング停止
  useEffect(() => {
    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current)
      }
    }
  }, [])

  // 初期ロード：残高・トラストライン・証明書
  useEffect(() => {
    if (!USER_ADDRESS) return

    const fetchAll = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchBalances(USER_ADDRESS),
          fetchTrustlines(USER_ADDRESS),
          fetchCertificates(USER_ADDRESS),
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [])

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

      const njpBalance =
        data.issued.find((i) => i.currency === "NJP" && i.issuer === NJP_ISSUER)?.value ?? "0"

      setCurrencies([
        { name: "日本円", amount: 50000, symbol: "¥" }, // デモ用
        { name: "ドル", amount: 300, symbol: "$" }, // デモ用
        { name: "地元通貨", amount: Number(njpBalance), symbol: "NJP" },
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
        trustlines: { currency: string; issuer: string; balance: string; limit: string }[]
      }

      setHasNJPTrustline(data.hasNJP)
    } catch (e) {
      console.error("Error fetching trustlines:", e)
    }
  }

  // 証明書一覧取得（② GET /api/credentials/:address）
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

      const mapped: Certificate[] = data.credentials
        .filter((c) => c.metadata)
        .map((c) => ({
          code: c.metadata!.name || c.credentialType,
          date: c.metadata!.expireDate || "",
          credentialType: c.credentialType,
          issuer: c.issuer,
          rate: c.metadata!.rate,
        }))

      setCertificates(mapped)
    } catch (e) {
      console.error("Error fetching credentials:", e)
    }
  }

  // 証明書選択 → レート決定（/api/rate/apply）
  const handleCertificateSelect = async (cert: Certificate) => {
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
          address: USER_ADDRESS,
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

    if (!USER_ADDRESS) {
      setMessage("ウォレットアドレスが取得できませんでした")
      return
    }

    if (hasNJPTrustline) {
      setMessage("すでに NJP のトラストラインが設定されています")
      return
    }

    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/trustlines/payload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: USER_ADDRESS,
          currency: "NJP",
          issuer: NJP_ISSUER,
          limit: 1000000000,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("HTTP error", res.status, text)
        setMessage(`サーバーエラーが発生しました: ${res.status}`)
        return
      }

      const json = await res.json()
      if (!json.success) {
        setMessage(`トラストライン設定用ペイロードの作成に失敗しました: ${json.error ?? "unknown error"}`)
        return
      }

      const data = json.data as {
        uuid: string
        qrUrl: string
        deepLink: string
        address: string
        currency: string
        issuer: string
        limit: number
      }

      // XUMM を別タブで開く（デモとしてはこれでOK）
      window.open(data.deepLink, "_blank")
      setMessage("トラストライン設定用のトランザクションを作成しました。XUMM 上で承認してください。")

      // ポーリング開始（承認/拒否を監視）
      startPollingTrustlineStatus(data.uuid)
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
    try {
      const status = await fetchPayloadStatus(uuid)
      const signed = status?.meta?.signed

      if (signed === true) {
        // サイン済み → Ledger上の trustline を再取得
        await fetchTrustlines(USER_ADDRESS)

        setMessage("トラストラインが正常に設定されました ✅")
        window.clearInterval(id)
        pollingRef.current = null
      } else if (signed === false) {
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
      try {
        const status = await fetchPayloadStatus(uuid)
        const signed = status?.meta?.signed // true / false / null

        if (signed === true) {
          setMessage("トランザクションが承認されました ✅")
          window.clearInterval(id)
          pollingRef.current = null
          // TODO: 必要ならここで残高再取得
          // await fetchBalances(USER_ADDRESS)
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

    const amount = Number.parseFloat(exchangeAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      setMessage("有効な金額を入力してください")
      return
    }

    if (!hasNJPTrustline) {
      setMessage("先に NJP のトラストラインを設定してください")
      return
    }

    if (!USER_ADDRESS) {
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
          fromAddress: USER_ADDRESS,
          toAddress: NJP_ISSUER,
          baseAmount: amount,
          rate: exchangeRate,
          userToken: USER_TOKEN,
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

      // window.open(data.deepLink, "_blank")
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

      // push 通知で承認を待つので、deepLink / QR は開かない
      startPollingPayloadStatus(data.uuid)

      // 本当はトランザクション承認後に再取得するひつようがあるが、
      // デモとして「すぐ反映」したい場合はここで再取得
      // await fetchBalances(USER_ADDRESS)
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
          <WoodenButton onClick={() => router("/")} variant="secondary">
            🏠 町に戻る
          </WoodenButton>
        </div>
      </div>
    </div>
  )
}
