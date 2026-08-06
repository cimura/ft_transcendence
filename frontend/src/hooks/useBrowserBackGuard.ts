import { useCallback, useEffect, useRef } from 'react'

type BrowserBackGuardOptions = {
  /** history.state に載せる目印のキー(画面ごとに別のキーを使うこと) */
  stateKey: string
  /** 目印の値(通常は roomId)。ガードの有効/無効判定には使わず、デバッグ用途。 */
  guardValue: string
  enabled?: boolean
  /**
   * バックボタン(popstate)が押されたときに呼ばれる。
   * true を返すとページから離脱してよい。false を返すとこのページに留まる
   * (呼び出し側で確認ダイアログをキャンセルした場合など)。
   */
  onBack: () => Promise<boolean>
  /** ガードを抜けて離脱が確定したときの後始末(画面遷移・状態クリアなど) */
  onExit: () => void
}

/**
 * ブラウザの戻る操作でページが不用意にアンマウントされるのを防ぐガード。
 *
 * React Router は popstate を検知した時点で即座にページをアンマウントし得るため、
 * 素の popstate ハンドラでは非同期の離脱処理(APIコール・確認ダイアログ)が
 * 完了する前に画面が消えてしまう。ここではマウント時にダミーの履歴エントリを
 * push しておき、popstate のたびに同じダミーを push し直すことで、
 * onBack が確定するまで実際のナビゲーションを足止めする。
 */
export function useBrowserBackGuard({
  stateKey,
  guardValue,
  enabled = true,
  onBack,
  onExit,
}: BrowserBackGuardOptions) {
  const hasGuardRef = useRef(false)
  const hasExitedRef = useRef(false)
  const onBackRef = useRef(onBack)
  const onExitRef = useRef(onExit)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    onExitRef.current = onExit
  }, [onExit])

  const pushGuard = useCallback(() => {
    window.history.pushState(
      { ...window.history.state, [stateKey]: guardValue },
      '',
      window.location.href
    )
    hasGuardRef.current = true
  }, [stateKey, guardValue])

  useEffect(() => {
    if (!enabled) return

    if (!hasGuardRef.current && !hasExitedRef.current) {
      pushGuard()
    }

    const handlePopState = async () => {
      if (hasExitedRef.current) {
        hasGuardRef.current = false
        onExitRef.current()
        return
      }

      // Back がガードのエントリを消費した直後。非同期の onBack が終わるまで
      // 連打で抜けられないよう、即座に積み直す。
      pushGuard()

      const canExit = await onBackRef.current()
      if (canExit) {
        hasExitedRef.current = true
        window.history.back()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [enabled, pushGuard])

  return { pushGuard }
}
