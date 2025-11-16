import { useState, useEffect } from "react"
import { WoodenButton } from "@repo/ui"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../src/context/AuthContext"
import { createCredentialWithMetadata, acceptCredential } from "@repo/utils"
import type { CredentialMetadata } from "@repo/utils/wallet/core"

interface Certificate {
  code: string
  date: string
  txHash?: string
  uri?: string
}

// Predefined metadata for each code
const CODE_METADATA: Record<string, CredentialMetadata> = {
  "CODE1": {
    name: "観光訪問証明書",
    type: "観光客",
    location: "東京都渋谷区",
    expireDate: "2025-12-31",
    rate: "1:1"
  },
  "CODE2": {
    name: "探検者証明書",
    type: "地域探検者",
    location: "京都市",
    expireDate: "2026-06-30",
    rate: "1.5:1"
  },
  "CODE3": {
    name: "ボランティア貢献証明書",
    type: "地域ボランティア",
    location: "大阪市",
    expireDate: "2025-12-31",
    rate: "2:1"
  },
  "CODE4": {
    name: "グルメレビュアー証明書",
    type: "飲食店レビュー",
    location: "福岡市",
    expireDate: "2026-03-31",
    rate: "10%"
  },
  "CODE5": {
    name: "イベント参加証明書",
    type: "イベント参加",
    location: "札幌市",
    expireDate: "2025-08-31",
    rate: "1:1"
  }
}

const pollPayloadStatus = async (uuid: string, onSigned: () => void, onError: (msg: string) => void) => {
  try {
    for (let i = 0; i < 150; i++) { // Poll for up to 5 minutes
      const res = await fetch(`http://localhost:3001/api/xumm/payload/${uuid}`)
      const data = await res.json()
      if (data.success && data.data?.meta?.signed === true) {
        onSigned()
        return
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    onError("署名がタイムアウトしました")
  } catch (e) {
    onError("署名ステータス取得に失敗しました")
  }
}

export default function CertificatePage() {
  const router = useNavigate()
  const { address } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([
    { code: "CODE1", date: "2024-01-15" },
    { code: "CODE2", date: "2024-02-20" },
  ])
  const [inputCode, setInputCode] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [deepLink, setDeepLink] = useState("")
  const [currentPayloadUuid, setCurrentPayloadUuid] = useState("")
  const [currentCode, setCurrentCode] = useState("")
  const [currentUri, setCurrentUri] = useState("")

  useEffect(() => {
    if (showQRModal && currentPayloadUuid) {
      setStatusMessage("⏳ 署名待ち...")
      pollPayloadStatus(
        currentPayloadUuid,
        () => {
          setShowQRModal(false)
          setStatusMessage("✅ 署名が完了しました！")
          handleQRModalClose()
        },
        (msg) => {
          setShowQRModal(false)
          setStatusMessage(`❌ ${msg}`)
          setIsProcessing(false)
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQRModal, currentPayloadUuid])

  const handleRegister = async () => {
    if (inputCode.trim() === "") {
      setStatusMessage("❌ コードを入力してください")
      return
    }

    if (!address) {
      setStatusMessage("❌ ウォレットを接続してください")
      return
    }

    const code = inputCode.trim().toUpperCase()
    const metadata = CODE_METADATA[code]

    if (!metadata) {
      setStatusMessage(`❌ コード "${code}" は無効です。有効なコード: ${Object.keys(CODE_METADATA).join(", ")}`)
      return
    }

    setIsProcessing(true)
    setStatusMessage("📤 IPFS にメタデータをアップロード中...")

    try {
      // Step 1: Upload metadata to IPFS and create credential
      setStatusMessage("🔐 クレデンシャルを作成中...")
      
      console.log('[CERT-PAGE] Creating credential with metadata...')
      const createResult = await createCredentialWithMetadata(
        address,
        code, // Use code as credential type
        metadata
      )

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create credential")
      }

      console.log('[CERT-PAGE] Credential created, URI:', createResult.uri)
      setCurrentUri(createResult.uri || "")
      setCurrentCode(code)

      setStatusMessage("⏳ レジャーでの確認を待機中...")
      
      // Wait for credential to be confirmed
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Step 2: Accept the credential (this will show QR code)
      setStatusMessage("📱 XUMM で資格情報を受け入れ中...")
      
      console.log('[CERT-PAGE] Accepting credential...')
      const acceptResult = await acceptCredential(
        { isConnected: true, address },
        { credentialType: code }
      )

      console.log('[CERT-PAGE] Accept result:', acceptResult)

      if (!acceptResult.success) {
        throw new Error(acceptResult.error || "Failed to accept credential")
      }

      // Show QR code modal
      if (acceptResult.qrUrl && acceptResult.uuid) {
        console.log('[CERT-PAGE] Showing QR modal')
        console.log('[CERT-PAGE] QR URL:', acceptResult.qrUrl)
        console.log('[CERT-PAGE] UUID:', acceptResult.uuid)
        
        setQrCodeUrl(acceptResult.qrUrl)
        setDeepLink(acceptResult.deepLink || "")
        setCurrentPayloadUuid(acceptResult.uuid)
        setShowQRModal(true)
        setStatusMessage("📱 QR コードをスキャンして署名してください")
      } else {
        console.log('[CERT-PAGE] No QR URL or UUID in result:', acceptResult)
        throw new Error("QR コードの生成に失敗しました")
      }

    } catch (error) {
      console.error("Failed to register certificate:", error)
      setStatusMessage(`❌ エラー: ${error instanceof Error ? error.message : "証明書の発行に失敗しました"}`)
      setIsProcessing(false)
    }
    // Don't set isProcessing to false here - wait for user to close modal
  }

  const handleQRModalClose = () => {
    setShowQRModal(false)
    setQrCodeUrl("")
    setDeepLink("")
    
    // Add the certificate to the list
    if (currentCode && address) {
      const newCertificate: Certificate = {
        code: currentCode,
        date: new Date().toISOString().split("T")[0],
        uri: currentUri
      }
      
      setCertificates([...certificates, newCertificate])
      setInputCode("")
      setStatusMessage(`✅ 証明書 "${currentCode}" が正常に発行されました！`)
      
      setTimeout(() => setStatusMessage(""), 5000)
    }
    
    setCurrentPayloadUuid("")
    setCurrentCode("")
    setCurrentUri("")
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-amber-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-amber-800 to-amber-900 border-4 border-amber-950 rounded-xl p-8 shadow-2xl mb-6">
          <h1 className="text-4xl font-bold text-amber-50 text-center mb-3">訪問者登録</h1>
          <p className="text-amber-100 text-center text-lg">
            この町を訪れていただき、ありがとうございます！
            <br />
            訪問証明書を発行いたします。
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg text-center font-medium ${
            statusMessage.includes("✅") ? "bg-green-100 text-green-800" :
            statusMessage.includes("❌") ? "bg-red-100 text-red-800" :
            "bg-blue-100 text-blue-800"
          }`}>
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側: 証明書一覧 */}
          <div className="lg:col-span-2">
            <div className="bg-white border-4 border-amber-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-amber-900 mb-4 border-b-2 border-amber-300 pb-2">
                所有している訪問証明書
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {certificates.map((cert, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-amber-700 font-semibold">訪問者コード</p>
                        <p className="text-xl font-mono font-bold text-amber-900">{cert.code}</p>
                        {cert.txHash && (
                          <p className="text-xs text-amber-600 mt-1">
                            TX: {cert.txHash.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-amber-700 font-semibold">訪問日</p>
                        <p className="text-lg font-mono text-amber-900">{cert.date}</p>
                        {cert.uri && (
                          <a 
                            href={cert.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            詳細を見る →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 登録フォーム */}
          <div className="lg:col-span-1">
            <div className="bg-white border-4 border-amber-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-amber-900 mb-4 border-b-2 border-amber-300 pb-2">新規登録</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-amber-900 font-semibold mb-2">訪問者コード</label>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="任意のコードを入力"
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-amber-900 font-mono"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-amber-700 mt-2">
                    有効なコード: {Object.keys(CODE_METADATA).join(", ")}
                  </p>
                </div>
                <WoodenButton 
                  onClick={handleRegister} 
                  variant="primary" 
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? "処理中..." : "登録する"}
                </WoodenButton>
                <WoodenButton onClick={() => router("/")} variant="secondary" className="w-full">
                  町に戻る
                </WoodenButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-amber-900 mb-4 text-center">
              XUMM で署名してください
            </h3>
            <div className="bg-white p-4 rounded-lg border-4 border-amber-300 mb-4">
              <img src={qrCodeUrl} alt="XUMM QR Code" className="w-full" />
            </div>
            <p className="text-sm text-gray-600 text-center mb-4">
              XUMM アプリでこの QR コードをスキャンして、トランザクションに署名してください
            </p>
            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-500 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors mb-2"
              >
                XUMM アプリで開く
              </a>
            )}
            <button
              onClick={handleQRModalClose}
              className="w-full bg-gray-300 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}