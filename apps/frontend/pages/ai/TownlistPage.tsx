import { useNavigate } from "react-router-dom";
import { logout } from '@repo/utils/wallet/browser';

// 都市データの定義
const cities = [
    { name: 'Z県N市', status: 'available', image: './images/city_n.jpg', description: '歴史と文化が息づく街。' },
    { name: 'B県Y市', status: 'coming_soon', image: './images/city_y.jpg', description: '未来都市計画が進行中。' },
    { name: 'M県K市', status: 'coming_soon', image: './images/city_k.jpg', description: '自然豊かなリゾート地。' },
];

const TownlistPage = () => {
    const router = useNavigate();


    // ログアウト処理のモック
    const handleLogout = async () => {
        await logout();
        console.log('ログアウトしました。');
        router("/login");
    };

    // 訪問ボタンのクリックハンドラー
    const handleVisit = (cityName: string) => {
        if (cityName === 'Z県N市') {
            // 実際のアプリケーションでは、ここでルーティング処理（例: navigate('/city/A')）を実行します。
            router("/town-n");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col">
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-300">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    訪問先 都市選択
                </h1>
            </header>

            <main className="container mx-auto flex-grow w-full"> {/* flex-grow でメインコンテンツが残りのスペースを占有 */}
                <h2 className="text-xl font-semibold text-gray-700 mb-6">訪問可能な都市を選択してください：</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cities.map((city) => (
                        <div
                            key={city.name}
                            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200"
                        >
                            {/* 町の画像 */}
                            <div className="h-40 overflow-hidden">
                                <img
                                    src={city.image}
                                    alt={city.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="p-5">
                                {/* 都市名 */}
                                <h3 className="text-2xl font-bold mb-2 text-gray-800">
                                    {city.name}
                                </h3>
                                {/* 説明 */}
                                <p className="text-gray-600 mb-4 text-sm">
                                    {city.description}
                                </p>

                                {/* 訪問ボタン */}
                                <button
                                    onClick={() => handleVisit(city.name)}
                                    disabled={city.status === 'coming_soon'}
                                    className={`
                                        w-full py-3 text-lg font-bold rounded-lg transition duration-200 flex items-center justify-center shadow-md
                                        ${city.status === 'available'
                                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' // 活性時
                                            : 'bg-gray-300 text-gray-800 cursor-not-allowed opacity-75' // 非活性時
                                        }
                                    `}
                                >
                                    {city.status === 'available' ? (
                                        <>訪問する</>
                                    ) : (
                                        <>準備中</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* -------------------- ログアウトボタンを画面下部に配置 (フッター) -------------------- */}
            <footer className="pt-4 border-t border-gray-300">
                <div className="container mx-auto flex justify-center">
                    <button
                        onClick={handleLogout}
                        className="flex items-center px-6 py-3 bg-yellow-600 text-white text-base font-semibold rounded-lg shadow-xl hover:bg-red-700 transition duration-150 transform hover:scale-[1.01]"
                    >
                        ログアウト
                    </button>
                </div>
                <p className="text-center text-xs text-gray-500 mt-2">
                    &copy; 2025 LEMONEX. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

export default TownlistPage;