"use client"

import { useEffect, useRef, useState } from "react"
import { WoodenButton } from "./wooden-button"
import { useNavigate } from "react-router-dom"

interface TiledLayer {
  data: number[]
  height: number
  id: number
  name: string
  opacity: number
  type: string
  visible: boolean
  width: number
  x: number
  y: number
}

interface TiledMap {
  compressionlevel: number
  height: number
  infinite: boolean
  layers: TiledLayer[]
  nextlayerid: number
  nextobjectid: number
  orientation: string
  renderorder: string
  tiledversion: string
  tileheight: number
  tilewidth: number
  type: string
  version: string
  width: number
}

interface MapData {
  width: number
  height: number
  tileSize: number
  layers: {
    base: number[]
    objects: number[]
    road: number[]
  }
}

// 衝突判定用タイルID
const collisionTiles = [7, 8, 9, 10, 11, 23, 24, 26, 27, 28, 39, 56, 57, 103]

const npcs = [
  { id: 1, x: 22, y: 11, name: "ガイド", message: "地元の名産品がいっぱいありますよ。販売ページを見ますか？", hasChoice: true, action: "merchant" },
  {
    id: 2,
    x: 13,
    y: 3,
    name: "住人A",
    message: "N市へようこそ！町のHPをみますか？",
    hasChoice: true,
    action: "external",
  },
  {
    id: 3,
    x: 17,
    y: 10,
    name: "住人B",
    message: "良い天気ですね。散歩日和です。",
    hasChoice: false,
    action: null,
  },
  {
    id: 4,
    x: 11,
    y: 15,
    name: "ガイドB",
    message: "町を訪問いただきありがとうございます！訪問者登録しますか？",
    hasChoice: true,
    action: "certificate",
  },
  {
    id: 5,
    x: 12,
    y: 5,
    name: "ガイドC",
    message: "地元通貨と交換しますか？今ならお得ですよ",
    hasChoice: true,
    action: "exchange",
  },
]

interface DialogState {
  visible: boolean
  message: string
  hasChoice: boolean
  npcId: number | null
  action: string | null
}

export function GameCanvas() {
  const router = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [dialog, setDialog] = useState<DialogState>({
    visible: false,
    message: "",
    hasChoice: false,
    npcId: null,
    action: null,
  })

  const playerPosRef = useRef({ x: 21 * 32, y: 14 * 32 })
  const targetPosRef = useRef<{ x: number; y: number } | null>(null)
  const cameraPosRef = useRef({ x: 0, y: 0 })
  const tilesetRef = useRef<HTMLImageElement | null>(null)
  const characterRef = useRef<HTMLImageElement | null>(null)
  const npcRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const response = await fetch("/json/map1.json")
        const tiledData: TiledMap = await response.json()

        // Convert Tiled format to our internal format
        const baseLayer = tiledData.layers.find((layer) => layer.name === "base")
        const objectsLayer = tiledData.layers.find((layer) => layer.name === "objects")
        const roadLayer = tiledData.layers.find((layer) => layer.name === "road")

        if (!baseLayer || !objectsLayer || !roadLayer) {
          throw new Error("Required layers not found in map data")
        }

        const convertedMapData: MapData = {
          width: tiledData.width,
          height: tiledData.height,
          tileSize: tiledData.tilewidth,
          layers: {
            base: baseLayer.data,
            objects: objectsLayer.data,
            road: roadLayer.data,
          },
        }

        setMapData(convertedMapData)
      } catch (error) {
        console.error("Failed to load map data:", error)
      }
    }

    loadMapData()
  }, [])

  useEffect(() => {
    if (!mapData) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number

    // 画像読み込み
    const tilesetImg = new Image()
    tilesetImg.crossOrigin = "anonymous"
    tilesetImg.src = "/images/design-mode/map1.png"

    const characterImg = new Image()
    characterImg.crossOrigin = "anonymous"
    characterImg.src = "/images/design-mode/character.png"

    const npcImg = new Image()
    npcImg.crossOrigin = "anonymous"
    npcImg.src = "/images/design-mode/npc.png"

    let imagesLoaded = 0
    const checkImagesLoaded = () => {
      imagesLoaded++
      if (imagesLoaded === 3) {
        tilesetRef.current = tilesetImg
        characterRef.current = characterImg
        npcRef.current = npcImg
        gameLoop()
      }
    }

    tilesetImg.onload = checkImagesLoaded
    characterImg.onload = checkImagesLoaded
    npcImg.onload = checkImagesLoaded

    const isNpcTile = (tileX: number, tileY: number): boolean => {
      return npcs.some((npc) => npc.x === tileX && npc.y === tileY)
    }

    const isCollision = (tileX: number, tileY: number): boolean => {
      if (tileX < 0 || tileX >= mapData.width || tileY < 0 || tileY >= mapData.height) {
        return true
      }
      const index = tileY * mapData.width + tileX
      const objectTile = mapData.layers.objects[index]
      return collisionTiles.includes(objectTile) || isNpcTile(tileX, tileY)
    }

    const drawTile = (ctx: CanvasRenderingContext2D, tileId: number, x: number, y: number) => {
      if (!tilesetRef.current || tileId === 0) return

      const tilesPerRow = 16
      const tileIndex = tileId - 1
      const sx = (tileIndex % tilesPerRow) * 32
      const sy = Math.floor(tileIndex / tilesPerRow) * 32

      ctx.drawImage(tilesetRef.current, sx, sy, 32, 32, x, y, 32, 32)
    }

    const drawLayer = (ctx: CanvasRenderingContext2D, layerData: number[]) => {
      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const tileId = layerData[y * mapData.width + x]
          const screenX = x * 32 + cameraPosRef.current.x
          const screenY = y * 32 + cameraPosRef.current.y
          drawTile(ctx, tileId, screenX, screenY)
        }
      }
    }

    const gameLoop = () => {
      if (!ctx || !canvas) return

      // 移動処理
      if (targetPosRef.current) {
        const dx = targetPosRef.current.x - playerPosRef.current.x
        const dy = targetPosRef.current.y - playerPosRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 4

        if (distance < speed) {
          playerPosRef.current.x = targetPosRef.current.x
          playerPosRef.current.y = targetPosRef.current.y
          targetPosRef.current = null
        } else {
          playerPosRef.current.x += (dx / distance) * speed
          playerPosRef.current.y += (dy / distance) * speed
        }
      }

      // カメラ更新
      cameraPosRef.current.x = canvas.width / 2 - playerPosRef.current.x - 16
      cameraPosRef.current.y = canvas.height / 2 - playerPosRef.current.y - 16

      // 描画
      ctx.fillStyle = "#1a1a2e"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawLayer(ctx, mapData.layers.base)
      drawLayer(ctx, mapData.layers.road)
      drawLayer(ctx, mapData.layers.objects)

      // プレイヤー描画
      if (characterRef.current) {
        ctx.drawImage(
          characterRef.current,
          0,
          0,
          32,
          32,
          playerPosRef.current.x + cameraPosRef.current.x,
          playerPosRef.current.y + cameraPosRef.current.y,
          32,
          32,
        )
      }

      // NPC描画
      if (npcRef.current) {
        npcs.forEach((npc, index) => {
          const spriteX = 0
          const spriteY = index * 32
          ctx.drawImage(
            npcRef.current!,
            spriteX,
            spriteY,
            32,
            32,
            npc.x * 32 + cameraPosRef.current.x,
            npc.y * 32 + cameraPosRef.current.y,
            32,
            32,
          )
        })
      }

      animationFrameId = requestAnimationFrame(gameLoop)
    }

    const handleClick = (e: MouseEvent) => {
      if (!canvas || dialog.visible || targetPosRef.current) return

      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      // ワールド座標に変換
      const worldX = clickX - cameraPosRef.current.x
      const worldY = clickY - cameraPosRef.current.y
      const tileX = Math.floor(worldX / 32)
      const tileY = Math.floor(worldY / 32)

      // NPC判定
      const clickedNpc = npcs.find((npc) => npc.x === tileX && npc.y === tileY)
      if (clickedNpc) {
        const playerTileX = Math.floor(playerPosRef.current.x / 32)
        const playerTileY = Math.floor(playerPosRef.current.y / 32)

        // Check if player is adjacent (up, down, left, or right)
        const isAdjacent =
          (Math.abs(playerTileX - clickedNpc.x) === 1 && playerTileY === clickedNpc.y) ||
          (Math.abs(playerTileY - clickedNpc.y) === 1 && playerTileX === clickedNpc.x)

        if (isAdjacent) {
          setDialog({
            visible: true,
            message: clickedNpc.message,
            hasChoice: clickedNpc.hasChoice,
            npcId: clickedNpc.id,
            action: clickedNpc.action || null,
          })
        }
        return
      }

      // 衝突判定
      if (isCollision(tileX, tileY)) {
        return
      }

      targetPosRef.current = { x: tileX * 32, y: tileY * 32 }
    }

    canvas.addEventListener("click", handleClick)

    return () => {
      canvas.removeEventListener("click", handleClick)
      cancelAnimationFrame(animationFrameId)
    }
  }, [dialog.visible, mapData])

  const closeDialog = () => {
    setDialog({ visible: false, message: "", hasChoice: false, npcId: null, action: null })
  }

  const handleYes = () => {
    if (dialog.action === "merchant") {
      router("/merchant")
    } else if (dialog.action === "certificate") {
      router("/certificate")
    } else if (dialog.action === "exchange") {
      router("/exchange")
    } else if (dialog.action === "external") {
      window.open("https://www.city.isehara.kanagawa.jp/", "_blank")
    }
    closeDialog()
  }

  if (!mapData) {
    return (
      <div className="relative w-full mt-10 flex items-center justify-center bg-[#fff4e0] h-[640px]">
        <p className="text-2xl font-mono text-gray-700">マップを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full mt-10 flex items-center justify-center bg-[#fff4e0]">
      <canvas ref={canvasRef} width={960} height={640} className="border-4 border-gray-700 rounded-lg" />

      {dialog.visible && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[600px] bg-gray-900/95 border-4 border-yellow-600 rounded-lg p-6 shadow-2xl">
          <p className="text-white text-lg font-mono mb-4 leading-relaxed">{dialog.message}</p>
          {dialog.hasChoice ? (
            <div className="flex gap-4 justify-end">
              <WoodenButton onClick={handleYes} variant="primary">
                はい
              </WoodenButton>
              <WoodenButton onClick={closeDialog} variant="secondary">
                いいえ
              </WoodenButton>
            </div>
          ) : (
            <div className="flex justify-end">
              <WoodenButton onClick={closeDialog} variant="primary">
                閉じる
              </WoodenButton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
