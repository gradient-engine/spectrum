import './PresenceAvatars.css'

const MAX_SHOWN = 4

export default function PresenceAvatars({ users }) {
  if (!users || users.length <= 1) return null

  const shown    = users.slice(0, MAX_SHOWN)
  const overflow = users.length - MAX_SHOWN

  return (
    <div className="presence">
      {shown.map((u, i) => (
        <div
          key={u.user_id || i}
          className="presence__avatar"
          style={{ zIndex: MAX_SHOWN - i }}
          title={u.name || u.user_id}
        >
          {u.avatar_url
            ? <img src={u.avatar_url} alt={u.name || ''} />
            : <span>{(u.name || '?')[0].toUpperCase()}</span>
          }
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
