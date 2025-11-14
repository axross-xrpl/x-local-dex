import { useState } from "react"
import { WoodenButton } from "@repo/ui"
import { useNavigate } from "react-router-dom"

interface Certificate {
  code: string
  date: string
}

export default function CertificatePage() {
  const router = useNavigate()
  const [certificates, setCertificates] = useState<Certificate[]>([
    { code: "VISITOR001", date: "2024-01-15" },
    { code: "EXPLORER123", date: "2024-02-20" },
  ])
  const [inputCode, setInputCode] = useState("")

  const handleRegister = () => {
    if (inputCode.trim() === "") return

    const newCertificate: Certificate = {
      code: inputCode.trim(),
      date: new Date().toISOString().split("T")[0],
    }

    setCertificates([...certificates, newCertificate])
    setInputCode("")
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
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-amber-700 font-semibold">訪問日</p>
                        <p className="text-lg font-mono text-amber-900">{cert.date}</p>
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
                  />
                </div>
                <WoodenButton onClick={handleRegister} variant="primary" className="w-full">
                  登録する
                </WoodenButton>
                <WoodenButton onClick={() => router("/")} variant="secondary" className="w-full">
                  町に戻る
                </WoodenButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
