import './PresenceAvatars.css'

const MAX_SHOWN = 5

export default function PresenceAvatars({ users = [], currentUserId }) {
  // Only show OTHER people — the current user's avatar is already the signout button
  const seen   = new Set()
  const others = users.filter(u => {
    if (u.user_id === currentUserId) return false
    if (seen.has(u.user_id)) return false
    seen.add(u.user_id)
    return true
  })

  if (!others.length) return null

  const shown    = others.slice(0, MAX_SHOWN)
  const overflow = others.length - MAX_SHOWN

  return (
    <div className="presence" title={others.map(u => u.name || 'Someone').join(', ')}>
      {shown.map((u, i) => (
        <div
          key={u.user_id || i}
          className="presence__avatar"
          style={{ zIndex: MAX_SHOWN - i }}
          title={u.name || 'Someone'}
        >
          {u.avatar_url
            ? <img src={u.avatar_url} alt={u.name || ''} />
            : <span>{(u.name || '?')[0].toUpperCase()}</span>
          }
          <div className="presence__live" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="presence__avatar presence__avatar--overflow" style={{ zIndex: 0 }}>
          <span>+{overflow}</span>
        </div>
      )}
    </div>
  )
}
