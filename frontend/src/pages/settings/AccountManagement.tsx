export const AccountManagement = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
        <p className="text-white/60 text-sm">ユーザーID</p>
        <p className="text-white text-xl font-bold">@your_handle</p>
      </div>
      <button className="w-full p-4 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10">
        パスワード変更
      </button>
      <button className="w-full p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded-xl hover:bg-red-900/30">
        アカウント削除
      </button>
    </div>
  )
}
