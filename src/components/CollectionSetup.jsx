import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './CollectionSetup.css'

export default function CollectionSetup({ session, onDone }) {
  const [mode,       setMode]       = useState('create') // 'create' | 'join'
  const [name,       setName]       = useState('')
  const [code,       setCode]       = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

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
    setLoading(true)
    setError('')
    try {
      const { data: col, error: colErr } = await supabase
        .from('collections')
        .select('*')
        .eq('invite_code', code.trim().toLowerCase())
        .single()
      if (colErr || !col) {
        setError('Invalid invite code. Check the link and try again.')
        setLoading(false)
        return
      }

      await supabase.from('collection_members')
        .upsert({ collection_id: col.id, user_id: session.user.id })

      onDone(col)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="collection-setup">
      <div className="collection-setup__card">
        <div className="collection-setup__header">
          <div className="collection-setup__title">Spectrum</div>
          <div className="collection-setup__sub">Brand Personality Filter</div>
        </div>

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
            <p className="collection-setup__desc">
              Paste the invite code from a shared Spectrum link.
            </p>
            <input
              className="collection-setup__input"
              type="text"
              placeholder="8-character code"
              value={code}
              onChange={e => setCode(e.target.value)}
              autoFocus
              maxLength={8}
            />
            {error && <p className="collection-setup__error">{error}</p>}
            <button
              className="collection-setup__btn"
              type="submit"
              disabled={loading || !code.trim()}
            >
              {loading ? 'Joining…' : 'Join collection'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
