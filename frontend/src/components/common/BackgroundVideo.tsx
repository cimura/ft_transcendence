// frontend/src/components/common/BackgroundVideo.tsx
export default function BackgroundVideo() {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 bg-black overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute min-w-full min-h-full object-cover opacity-60"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      {/* 動画の上に少し青暗いオーバーレイを重ねて文字を見やすくします */}
      <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply pointer-events-none" />
    </div>
  )
}
