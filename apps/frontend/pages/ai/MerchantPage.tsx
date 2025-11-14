import { useState } from "react"
import { WoodenButton } from "@repo/ui"
import { Link } from "react-router-dom"

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
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(false)

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
    setShowPurchaseMessage(true)
    setTimeout(() => {
      setShowPurchaseMessage(false)
      setCart([])
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-amber-100 drop-shadow-lg">地元の名産店</h1>
          <Link to="/">
            <WoodenButton variant="secondary">町に戻る</WoodenButton>
          </Link>
        </div>

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
                      <span className="text-yellow-300">{getTotalPrice()}NJP</span>
                    </div>
                    <WoodenButton onClick={handlePurchase} variant="primary" className="w-full">
                      決済する
                    </WoodenButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 購入完了メッセージ */}
      {showPurchaseMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gradient-to-br from-amber-700 to-amber-800 border-4 border-yellow-500 rounded-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <p className="text-3xl font-bold text-amber-100 text-center">購入しました！</p>
          </div>
        </div>
      )}
    </div>
  )
}
