// frontend/src/components/common/Panel.tsx
import React from 'react'

interface PanelProps {
  children: React.ReactNode
}

const Panel: React.FC<PanelProps> = ({ children }) => {
  return (
    <div
      className="
      relative p-8 w-full max-w-md
      bg-galactic-panel/80 backdrop-blur-sm
      border border-galactic-panelBorder
      shadow-[0_0_30px_rgba(11,19,15,0.8)]
    "
    >
      {/* 左上の小さな緑のドットとテキスト */}
      <div className="flex items-center gap-2 mb-8 text-xs tracking-widest text-lime">
        <div className="w-2 h-2 rounded-full bg-lime animate-pulse"></div>
        GALACTIC NETWORK ONLINE
      </div>
      {children}
    </div>
  )
}

export default Panel
