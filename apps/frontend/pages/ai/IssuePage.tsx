import { useState } from 'react';
import { setTrustline, issueXJPToken } from '@repo/utils/wallet/browser-xjpy';

const IssuePage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [secret, setSecret] = useState<string>('');
    const [message, setMessage] = useState<string>('');

    // 申請ボタンのクリックハンドラー: トラストラインの設定
    const handleApplyClick = async () => {

        if (!secret) {
            return;
        }

        setIsLoading(true);

        await setTrustline(secret);
        setIsLoading(false);
        setMessage("トラストラインの設定が完了しました。");
    };

    const handleIssueRequestClick = async () => {
        if (!secret) {
            return;
        }

        setIsLoading(true);
        await issueXJPToken(secret);
        setIsLoading(false);
        setMessage("XJPを発行しました。");
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white p-6 sm:p-10 rounded-xl shadow-2xl">
                <h1 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">
                    発行申請・依頼画面 (XJPステーブルコイン)
                </h1>
                <p className="text-gray-600 mb-8">
                    デモ用のステーブルコイン(XJP)を発行します。<br />
                    トラストラインの設定とXJPトークンを発行してください<br /><br />
                    デモ用の機能のためDevnetアカウントのシークレットキーの入力が必要です。
                </p>

                {/* 【追加】申請額入力ボックス */}
                <div className="mb-8 p-4 bg-white border border-gray-200 rounded-lg shadow-inner">
                    <label htmlFor="secret" className="block text-sm font-bold text-gray-700 mb-1">
                        トークンを受け取るアカウントの<span className='text-red-500'>シークレットキー</span>を入力(Devnetアカウント)
                    </label>
                    <input
                        id="secret"
                        type="text"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-lg text-right font-mono shadow-sm"
                        placeholder="sEdxxx...."
                    />
                </div>

                {/* -------------------- ボタン領域 -------------------- */}
                <div className="flex flex-col gap-4 mb-8">

                    {/* 申請ボタン (トラストライン設定) */}
                    <button
                        onClick={handleApplyClick}
                        disabled={isLoading}
                        className={`
                            flex items-center justify-center w-full p-4 text-white font-semibold rounded-lg transition duration-300 shadow-md
                            ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                            }
                        `}
                    >
                        {/* {isLoading && transactionUuid === null ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />} */}
                        {isLoading ? '処理中...' : '申請 (トラストライン設定)'}
                    </button>

                    {/* 発行依頼ボタン (XJPY送金) */}
                    <button
                        onClick={handleIssueRequestClick}
                        disabled={isLoading}
                        className={`
                            flex items-center justify-center w-full p-4 text-white font-semibold rounded-lg transition duration-300 shadow-md
                            ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                            }
                        `}
                    >
                        {/* {isLoading && transactionUuid === null ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />} */}
                        {isLoading ? '処理中...' : '発行依頼 (10,000 XJPY 送金)'}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default IssuePage;