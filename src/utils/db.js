const DB_NAME = 'spectrum-v1'
const STORE   = 'images'

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE)
    req.onsuccess  = e => { _db = e.target.result; resolve(_db) }
    req.onerror    = e => reject(e.target.error)
  })
}

export async function idbSet(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = resolve
    tx.onerror    = e => reject(e.target.error)
  })
}

export async function idbDelete(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = resolve
    tx.onerror    = e => reject(e.target.error)
  })
}

export async function idbGetAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx     = db.transaction(STORE, 'readonly')
    const result = {}
    const req    = tx.objectStore(STORE).openCursor()
    req.onsuccess = e => {
      const cursor = e.target.result
      if (cursor) { result[cursor.key] = cursor.value; cursor.continue() }
      else resolve(result)
    }
    req.onerror = e => reject(e.target.error)
  })
}
