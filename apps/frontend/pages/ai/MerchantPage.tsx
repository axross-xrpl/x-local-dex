import { useState, useEffect } from "react"
import { WoodenButton } from "@repo/ui"
import { Link } from "react-router-dom"
import { getWalletInfo, getCurrentWalletAddress } from '@repo/utils/wallet/browser';
import { apiService } from '../../src/services/api';


interface Product {
  id: number
  name: string
  price: number
  image: string
}

interface CartItem extends Product {
  quantity: number
}

const products: Product[] = [
  { id: 1, name: "ピザ", price: 1100, image: "🍕" },
  { id: 2, name: "サンドイッチ", price: 650, image: "🥪" },
  { id: 3, name: "カレー", price: 1200, image: "🍛" },
  { id: 4, name: "ワイン", price: 1800, image: "🍷" },
  { id: 5, name: "ぶどう", price: 1300, image: "🍇" },
  { id: 6, name: "リンゴ", price: 600, image: "🍎" },
]

export default function MerchantPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [balance, setBalance] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState("")
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [deepLink, setDeepLink] = useState("")
  const [currentPayloadUuid, setCurrentPayloadUuid] = useState("")

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


  useEffect(() => {
    setWalletInfo();
  }, [])

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
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQRModal, currentPayloadUuid])

  const setWalletInfo = async () => {
    try {
      const address = await getCurrentWalletAddress();

      const res = await fetch(`http://localhost:3001/api/njp/balance/${address}`)
      const data = await res.json()
      if (data.success) {
        setBalance(data.data.balance);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleQRModalClose = () => {
    setShowQRModal(false);
    setQrCodeUrl("");
    setDeepLink("");
    setStatusMessage(`支払いが完了しました`);

    setTimeout(() => setStatusMessage(""), 5000)
    setCurrentPayloadUuid("");  
  }

  const paymentNJP = async (amount: any) => {

    try {
      const fromAddress = await getCurrentWalletAddress();
      const toAddress = import.meta.env.VITE_SYSTEM_ADDRESS;

      if (!fromAddress || !amount) return;

      // Create payment via backend
      const paymentResult = await apiService.createPaymentNJP({
        fromAddress,
        toAddress,
        amount,
      });


      if (!paymentResult.success || !paymentResult.data) {
        throw new Error(paymentResult.error || 'Failed to create payment');
      }
      console.log(paymentResult.data);
      const { uuid, qrUrl: qr, deepLink: link } = paymentResult.data;

      // const pollResult = await pollPayloadStatus(uuid);

      if (qr && uuid) {
        //   setStatusMessage('Payment successful!');
        //   // onSuccess?.(pollResult.txId);
        //   setShowPurchaseMessage(true)
        console.log('[CERT-PAGE] Showing QR modal')
        console.log('[CERT-PAGE] QR URL:', qr)
        console.log('[CERT-PAGE] UUID:', uuid)

        setQrCodeUrl(qr)
        setDeepLink(deepLink || "")
        setCurrentPayloadUuid(uuid)
        setShowQRModal(true)
        setStatusMessage("📱 QR コードをスキャンして署名してください")

      } else {
        //   throw new Error(pollResult.error || 'Transaction failed');
        console.log('[CERT-PAGE] No QR URL or UUID in result:', paymentResult)
        throw new Error("QR コードの生成に失敗しました")
      }

    } catch (error) {
      console.error("Failed payment:", error)
      setStatusMessage(`❌ エラー: ${error instanceof Error ? error.message : "決済に失敗しました"}`)
    }
  }

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === productId)
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
      }
      return prevCart.filter((item) => item.id !== productId)
    })
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const handlePurchase = () => {
    const amount = getTotalPrice();
    const balanceNum = Number(balance);
    if (amount > balanceNum) {
      setStatusMessage("❌ NJPの残高が不足しています");
      return;
    }

    paymentNJP(amount);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-amber-100 drop-shadow-lg">地元の名産店</h1>
          <Link to="/town-n">
            <WoodenButton variant="secondary">町に戻る</WoodenButton>
          </Link>
        </div>
        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg text-center font-medium ${statusMessage.includes("✅") ? "bg-green-100 text-green-800" :
              statusMessage.includes("❌") ? "bg-red-100 text-red-800" :
                "bg-yellow-200 text-blue-800"
            }`}>
            {statusMessage}
          </div>
        )}

        <div className="flex gap-8">
          {/* 商品一覧 */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-gradient-to-br from-amber-700 to-amber-800 border-4 border-amber-600 rounded-lg p-6 shadow-xl hover:shadow-2xl transition-shadow"
                >
                  <div className="text-6xl text-center mb-4">{product.image}</div>
                  <h3 className="text-xl font-bold text-amber-100 text-center mb-2">{product.name}</h3>
                  <p className="text-2xl font-bold text-yellow-300 text-center mb-4">{product.price}NJP</p>
                  <WoodenButton onClick={() => addToCart(product)} variant="primary" className="w-full">
                    カートに追加
                  </WoodenButton>
                </div>
              ))}
            </div>
          </div>

          {/* カート */}
          <div className="w-80">
            <div className="bg-gradient-to-br from-amber-800 to-amber-900 border-4 border-amber-600 rounded-lg p-6 shadow-xl sticky top-8">
              <h2 className="text-2xl font-bold text-amber-100 mb-4 text-center">カート</h2>

              {cart.length === 0 ? (
                <p className="text-amber-200 text-center py-8">カートは空です</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-amber-700/50 border-2 border-amber-600 rounded p-3 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{item.image}</span>
                          <div>
                            <p className="text-amber-100 font-semibold">{item.name}</p>
                            <p className="text-yellow-300 text-sm">
                              {item.price}NJP × {item.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 bg-amber-600 hover:bg-amber-500 text-amber-100 rounded font-bold transition-colors"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 bg-amber-600 hover:bg-amber-500 text-amber-100 rounded font-bold transition-colors"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-amber-600 pt-4 mb-4">
                    <div className="flex justify-between text-xl font-bold text-amber-100 mb-4">
                      <span>合計:</span>
                      <span className="text-yellow-300">{getTotalPrice()} NJP</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-amber-600 pt-4 mb-4">
                    <div className="flex justify-between text-xl font-bold text-amber-100 mb-4">
                      <span>NJP保有額:</span>
                      <span className="text-yellow-300">{balance} NJP</span>
                    </div>
                  </div>
                  <WoodenButton onClick={handlePurchase} variant="primary" className="w-full">
                    決済する
                  </WoodenButton>
                </>
              )}
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
