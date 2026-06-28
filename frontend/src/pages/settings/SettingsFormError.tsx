interface SettingsFormErrorProps {
  message: string
  className?: string
}

export const SettingsFormError = ({
  message,
  className = '',
}: SettingsFormErrorProps) => {
  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 ${className}`}
    >
      {message}
    </div>
  )
}
