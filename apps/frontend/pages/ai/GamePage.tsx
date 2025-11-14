"use client"

import { GameCanvas } from "@repo/ui"

// const GameCanvas = dynamic(() => import("@/components/game-canvas"), {
//   ssr: false,
//   loading: () => (
//     <div className="flex h-screen w-full items-center justify-center bg-gray-900">
//       <div className="text-white text-xl">ゲームを読み込み中...</div>
//     </div>
//   ),
// })

export default function GamePage() {
  return (
    <div className="bg-[#fff4e0]">
      <div className="text-xl text-center pt-8">Z県N市</div>
      <main className="h-screen w-full overflow-hidden">
        <GameCanvas />
      </main>
    </div>
  )
}
