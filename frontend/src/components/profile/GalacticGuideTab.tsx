import { useGalacticGuide } from '../../hooks/useGalacticGuide'

interface GalacticGuideTabProps {
  userId: string
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  planet: '◉',
  towel: '▤',
  thumb: '★',
  trophy: '♛',
  'answer-42': '42',
  flame: '▲',
}

export const GalacticGuideTab = ({ userId }: GalacticGuideTabProps) => {
  const { guide, loading, error } = useGalacticGuide(userId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-cyan-100/60">銀河ガイドを読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400">エラー: {error}</div>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-cyan-100/60">銀河ガイドのデータがありません</div>
      </div>
    )
  }

  const { progression } = guide
  const progressWidth = Math.min(100, Math.max(0, progression.progressPercent))

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-cyan-400/30 bg-cyan-950/20 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/60">
              Traveller Level
            </p>
            <h2 className="mt-1 text-2xl font-bold text-cyan-100">
              Level {progression.level}
            </h2>
            <p className="text-cyan-300">{progression.title}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-cyan-100/50">Total XP</p>
            <p className="text-2xl font-bold text-cyan-100">
              {progression.totalXp}
            </p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-black/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-sm text-cyan-100/60">
          {progression.levelXpRequired === null ? (
            <span>MAX LEVEL</span>
          ) : (
            <>
              <span>
                {progression.currentLevelXp} / {progression.levelXpRequired} XP
              </span>
              <span>次のレベルまで {progression.xpToNextLevel} XP</span>
            </>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-cyan-100">銀河ガイド項目</h2>
            <p className="text-sm text-cyan-100/50">
              宇宙旅行中に発見された記録
            </p>
          </div>

          <p className="text-cyan-300">
            {guide.unlockedCount} / {guide.totalCount} 解除
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {guide.achievements.map((achievement) => {
            const achievementProgress = Math.min(
              achievement.progress,
              achievement.target
            )

            return (
              <article
                key={achievement.id}
                className={`rounded-2xl border p-5 transition-all ${
                  achievement.unlocked
                    ? 'border-cyan-400/40 bg-cyan-950/20'
                    : 'border-white/10 bg-black/30 opacity-60'
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-bold ${
                      achievement.unlocked
                        ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200'
                        : 'border-white/20 bg-black/40 text-white/30'
                    }`}
                  >
                    {ACHIEVEMENT_ICONS[achievement.icon] ?? '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-cyan-100">
                        {achievement.name}
                      </h3>

                      <span className="text-xs text-cyan-100/40">
                        {achievement.category}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-cyan-100/60">
                      {achievement.description}
                    </p>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/60">
                      <div
                        className={`h-full rounded-full ${
                          achievement.unlocked ? 'bg-cyan-400' : 'bg-white/20'
                        }`}
                        style={{
                          width: `${
                            (achievementProgress / achievement.target) * 100
                          }%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-cyan-100/50">
                      <span>
                        {achievement.progress} / {achievement.target}
                      </span>
                      <span>
                        {achievement.unlocked ? '解除済み' : '未解除'}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
