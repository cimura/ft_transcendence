import { useState, useRef, type ChangeEvent } from 'react'

interface AvatarUploadProps {
  currentAvatar?: string
  onUpload: (file: File) => void
  error?: string | null
}

export const AvatarUpload = ({
  currentAvatar,
  onUpload,
  error,
}: AvatarUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationError('ファイルサイズは5MB以下にしてください')
      return
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setValidationError('JPEG、PNG、WebP形式のみ対応しています')
      return
    }

    setValidationError(null)

    // プレビュー表示
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 親コンポーネントに通知
    onUpload(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <h3 className="text-white font-semibold mb-3">
        カスタム画像をアップロード
      </h3>

      <div className="flex items-center gap-4">
        {/* プレビュー */}
        <div className="w-24 h-24 rounded-full border-2 border-white/40 overflow-hidden bg-black/60">
          {preview || currentAvatar ? (
            <img
              src={preview || currentAvatar}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* ファイル選択ボタン */}
        <div className="flex-1">
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-white/10 text-white rounded-full border-2 border-white/40
                     hover:bg-white/20 hover:border-white/60 transition-all"
          >
            ファイルを選択
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-white/40 text-xs mt-2">
            JPEG、PNG、WebP形式、5MB以下
          </p>
        </div>
      </div>

      {/* エラー表示 */}
      {(validationError || error) && (
        <div className="mt-3 text-red-500 text-sm">
          {validationError || error}
        </div>
      )}
    </div>
  )
}
