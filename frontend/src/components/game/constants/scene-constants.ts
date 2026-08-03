// frontend/src/components/game/constants/scene-constants.ts
// frontend のみで使う定数を定義

export const SCENE_CONFIG = {
  grid: {
    centerDivisor: 2,
    y: -0.48,
    cellThickness: 1.0,
    sectionThickness: 1.5,
    fadeDistance: 30,
    offsetY: 0.01,
  },
  field: {
    offsetY: -4.2,
    scale: [2.6, 4, 2.3] as [number, number, number],
  },
  camera: {
    height: 10,
    distanceFromCenter: 9,
    fov: 58,
    targetY: 0,
    fitMargin: 1.1, // 0.85から1.1へ変更（マップ全体が収まるように余白を確保）
    contentTopY: 1.0,
  },
  light: {
    ambientIntensity: 0.42,
    directionalPosition: [10, 10, 5] as [number, number, number],
    directionalIntensity: 0.7,
    pointHeight: 3,
    pointIntensity: 4,
    pointDistance: 15,
  },
  ground: {
    y: -0.5,
    sizePadding: 1,
  },
  colors: {
    background: '#010103',
    ground: '#050510',
    gridCell: '#222222',
    gridSection: '#00ffff',
    solidBlock: '#080808',
    solidPillar: '#111111',
    solidEdge: '#00ffff',
    breakableShell: '#111111',
    breakableEdge: '#333333',
    localBomb: '#ffffff',
    localBombEmissive: '#00ffff',
    enemyBomb: '#ff0000',
    enemyBombEmissive: '#ff0000',
    bombAura: '#ffffff',
    pointLight: '#ff00ff',
  },
  playerLabel: {
    height: 0.95,
    zIndexRange: [9, 0] as [number, number],
  },
}
