// frontend/src/components/common/BackgroundVideo.tsx
export default function BackgroundVideo() {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 bg-black overflow-hidden flex items-center justify-center">
      {/*
        動画(1920x1080, 16:9)と同じアスペクト比のフレーム。
        aspect-video + min-w-full min-h-full を flex center の中に置くことで、
        object-fit:cover と同じ計算式（縦横どちらか大きい方に合わせて拡大）でサイズが決まる。
        動画とタイトル画像の両方をこのフレームの内側に置くことで、
        ウィンドウサイズが変わっても両者が常に同じ倍率で拡大・縮小される。
      */}
      <div className="relative min-w-full min-h-full aspect-video shrink-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>

        {/* ゲームタイトル。フレームに対する%指定なので動画と同じ比率で拡大縮小される */}
        <img
          src="/game-title.png"
          alt=""
          className="absolute top-[17%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[13%] h-auto object-contain opacity-60 pointer-events-none select-none"
        />
      </div>

      {/* 動画の上に少し青暗いオーバーレイを重ねて文字を見やすくします */}
      <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply pointer-events-none" />
    </div>
  )
}
