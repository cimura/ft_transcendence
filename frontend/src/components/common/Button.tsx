interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'rounded-full font-bold tracking-wider transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 border border-transparent backdrop-blur-sm'
  const variantStyles = {
    primary:
      // ネオンシアンの輝きを持つボタン
      'bg-cyan-600/80 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] border-cyan-400/50',
    secondary:
      // 暗めのスペースブルーのボタン
      'bg-slate-800/80 hover:bg-slate-700 text-cyan-100 border-slate-600 hover:border-cyan-500/50',
    danger:
      // エラー/警告用（赤い星や爆発をイメージ）
      'bg-red-600/80 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)] border-red-400/50',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
