export const NotificationSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
        <span className="text-white">プッシュ通知</span>
        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
        </div>
      </div>
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
        <span className="text-white">メール通知</span>
        <div className="w-12 h-6 bg-gray-600 rounded-full relative">
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
  )
}
