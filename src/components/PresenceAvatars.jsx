import './PresenceAvatars.css'

const MAX_SHOWN = 5

export default function PresenceAvatars({ users = [], currentUserId }) {
  if (!users.length) return null

  // Deduplicate by user_id — same person in multiple tabs only shows once
  const seen  = new Set()
  const unique = users.filter(u => {
    if (seen.has(u.user_id)) return false
    seen.add(u.user_id)
    return true
  })

  // Sort: current user first, then others
  const sorted   = [...unique].sort((a, b) => (a.user_id === currentUserId ? -1 : b.user_id === currentUserId ? 1 : 0))
  const shown    = sorted.slice(0, MAX_SHOWN)
  const overflow = sorted.length - MAX_SHOWN
  const others   = sorted.filter(u => u.user_id !== currentUserId)

  return (
    <div className="presence" title={others.length ? `${others.map(u => u.name || 'Someone').join(', ')} also online` : 'Only you online'}>
      {shown.map((u, i) => {
        const isYou = u.user_id === currentUserId
        return (
          <div
            key={u.user_id || i}
            className={`presence__avatar${isYou ? ' presence__avatar--you' : ''}`}
            style={{ zIndex: MAX_SHOWN - i }}
            title={isYou ? 'You' : (u.name || 'Someone')}
          >
            {u.avatar_url
              ? <img src={u.avatar_url} alt={u.name || ''} />
              : <span>{(u.name || '?')[0].toUpperCase()}</span>
            }
            {!isYou && <div className="presence__live" />}
          </div>
        )
      })}
      {overflow > 0 && (
        <div className="presence__avatar presence__avatar--overflow" style={{ zIndex: 0 }}>
          <span>+{overflow}</span>
        </div>
      )}
    </div>
  )
}
