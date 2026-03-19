import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './CollectionSetup.css'

export default function CollectionSetup({ session, onDone, pendingCode, onClose }) {
  const [mode,    setMode]    = useState(pendingCode ? 'join' : 'create')
  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState(pendingCode || '')
  const [loading, setLoading] = useState(!!pendingCode)
  const [error,   setError]   = useState('')

  // Auto-join when arriving via invite link
  useEffect(() => {
    if (pendingCode) joinWithCode(pendingCode)
  }, [])

  async function joinWithCode(c) {
    setLoading(true)
    setError('')
    try {
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .select('*')
        .eq('invite_code', c.trim().toLowerCase())
        .single()
      if (colErr || !col) {
        setError('This invite link is invalid or has expired.')
        setLoading(false)
        return
      }
      await supabase.from('collection_members')
        .upsert({ collection_id: col.id, user_id: session.user.id })
      localStorage.setItem('spectrum-active-collection', col.id)
      onDone(col)
    } catch (err) {
      setError('Could not join. Please try again.')
      console.error(err)
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .insert({ name: name.trim(), owner_id: session.user.id })
        .select()
        .single()
      if (colErr) throw colErr

      const { error: memErr } = await supabase
        .from('collection_members')
        .insert({ collection_id: col.id, user_id: session.user.id })
      if (memErr) throw memErr

      localStorage.setItem('spectrum-active-collection', col.id)
      onDone(col)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    }
    setLoading(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!code.trim()) return
    joinWithCode(code)
  }

  // While auto-joining, show a minimal loading screen
  if (pendingCode && loading && !error) {
    return (
      <div className="collection-setup">
        <div className="collection-setup__card">
          <div className="collection-setup__header">
            <div className="collection-setup__title">Spectrum</div>
            <div className="collection-setup__sub">Brand Personality Filter</div>
          </div>
          <p className="collection-setup__desc" style={{ textAlign: 'center', marginTop: '16px' }}>
            Joining collection…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="collection-setup">
      <div className="collection-setup__card">
        {onClose && (
          <button className="collection-setup__close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        <div className="collection-setup__header">
          <div className="collection-setup__title">Spectrum</div>
          <div className="collection-setup__sub">Brand Personality Filter</div>
        </div>

        {/* Tabs — only shown when not arriving via invite link */}
        {!pendingCode && (
          <div className="collection-setup__tabs">
            <button
              className={`collection-setup__tab${mode === 'create' ? ' collection-setup__tab--active' : ''}`}
              onClick={() => { setMode('create'); setError('') }}
            >
              New collection
            </button>
            <button
              className={`collection-setup__tab${mode === 'join' ? ' collection-setup__tab--active' : ''}`}
              onClick={() => { setMode('join'); setError('') }}
            >
              Join existing
            </button>
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="collection-setup__form">
            <p className="collection-setup__desc">
              Give your collection a name. You can invite collaborators once it's created.
            </p>
            <input
              className="collection-setup__input"
              type="text"
              placeholder="e.g. Nike Brand Review"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={60}
            />
            {error && <p className="collection-setup__error">{error}</p>}
            <button
              className="collection-setup__btn"
              type="submit"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating…' : 'Create collection'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="collection-setup__form">
            {pendingCode ? (
              <p className="collection-setup__desc">
                There was a problem joining automatically. Click below to try again.
              </p>
            ) : (
              <p className="collection-setup__desc">
                Paste the invite code from a shared Spectrum link.
              </p>
            )}
            {!pendingCode && (
              <input
                className="collection-setup__input"
                type="text"
                placeholder="8-character code"
                value={code}
                onChange={e => setCode(e.target.value)}
                autoFocus
                maxLength={8}
              />
            )}
            {error && <p className="collection-setup__error">{error}</p>}
            <button
              className="collection-setup__btn"
              type="submit"
              disabled={loading || (!pendingCode && !code.trim())}
            >
              {loading ? 'Joining…' : 'Join collection'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
