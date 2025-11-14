import { useState } from "react"
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
}

export default function ExchangePage() {
  const router = useNavigate()
  const [currencies, setCurrencies] = useState<Currency[]>([
    { name: "日本円", amount: 50000, symbol: "¥" },
    { name: "ドル", amount: 300, symbol: "$" },
    { name: "地元通貨", amount: 0, symbol: "NJP" },
  ])
  const [exchangeAmount, setExchangeAmount] = useState("")
  const [showCertificates, setShowCertificates] = useState(false)
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [exchangeRate, setExchangeRate] = useState(1.0)
  const [message, setMessage] = useState("")
  const [hasReceivedBonus, setHasReceivedBonus] = useState(false)

  // ダミーの訪問証明書
  const dummyCertificates: Certificate[] = [
    { code: "ISE2024-001", date: "2024-01-15" },
    { code: "ISE2024-042", date: "2024-02-28" },
    { code: "ISE2024-099", date: "2024-03-10" },
  ]

  const handleExchange = () => {
    const amount = Number.parseFloat(exchangeAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage("有効な金額を入力してください")
      return
    }

    const jpyIndex = currencies.findIndex((c) => c.name === "日本円")
    const localIndex = currencies.findIndex((c) => c.name === "地元通貨")

    if (currencies[jpyIndex].amount < amount) {
      setMessage("日本円が不足しています")
      return
    }

    // 交換実行
    const newCurrencies = [...currencies]
    newCurrencies[jpyIndex].amount -= amount
    const convertedAmount = amount * exchangeRate
    newCurrencies[localIndex].amount += convertedAmount

    // ボーナス付与（初回のみ）
    if (!hasReceivedBonus) {
      newCurrencies[localIndex].amount += 1000
      setMessage(
        `交換完了！${convertedAmount.toFixed(0)}NJP + ボーナス1000NJP = ${(convertedAmount + 1000).toFixed(0)}NJP を取得しました！`,
      )
      setHasReceivedBonus(true)
    } else {
      setMessage(`交換完了！${convertedAmount.toFixed(0)}NJP を取得しました！`)
    }

    setCurrencies(newCurrencies)
    setExchangeAmount("")
  }

  const handleCertificateSelect = (cert: Certificate) => {
    setSelectedCertificate(cert)
    setExchangeRate(1.2)
    setShowCertificates(false)
    setMessage(`証明書「${cert.code}」を適用しました！交換レートが1:1.2になりました！`)
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
                  {dummyCertificates.map((cert, index) => (
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
                  <p className="text-xs text-green-700 mt-1">交換レート: 1:1.2（20%お得！）</p>
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

                <WoodenButton onClick={handleExchange} variant="primary" className="w-full text-xl py-4">
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
