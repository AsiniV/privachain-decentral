import { createHelia } from 'helia'
import { createOrbitDB, Identities, type OrbitDB, Documents, type DocStore } from '@orbitdb/core'

export interface SearchDoc {
  id: string
  type: 'message' | 'email' | 'file' | 'domain' | 'transaction' | 'video' | 'identity' | string
  title: string
  description?: string
  keywords?: string[]
  timestamp: number
  source: string
  cid?: string
  encrypted?: boolean
  zkProof?: string
}

let orbitdb: OrbitDB | null = null
let store: DocStore<SearchDoc> | null = null

export async function initSearch(dbName = 'privachain.search') {
  if (orbitdb && store) {
    return // Already initialized
  }
  try {
    const helia = await createHelia()
    const identities = await Identities()
    orbitdb = await createOrbitDB({ ipfs: helia, identities })
    store = await orbitdb.open<SearchDoc>(dbName, { Database: Documents({ indexBy: 'id' }) })
    await store.load()
  } catch (error) {
    console.error('Error initializing search:', error)
    throw new Error(`Failed to initialize OrbitDB: ${error.message}`)
  }
}

export async function index(doc: SearchDoc) {
  if (!store) {
    throw new Error('Search not initialized. Call initSearch() first.')
  }
  try {
    await store.put(doc)
  } catch (error) {
    console.error('Error indexing document:', error)
    throw new Error(`Failed to index document: ${error.message}`)
  }
}

export async function query(term: string, filters: Partial<Pick<SearchDoc, 'type' | 'encrypted' | 'source'>> = {}) {
  if (!store) {
    throw new Error('Search not initialized. Call initSearch() first.')
  }
  try {
    const lowerTerm = term.toLowerCase()
    const terms = lowerTerm.split(/\s+/).filter(t => t.length > 0) // Split into words for better matching
    const results = store.query(d => {
      const t = (d.title || '').toLowerCase()
      const desc = (d.description || '').toLowerCase()
      const kw = (d.keywords || []).join(' ').toLowerCase()
      const content = `${t} ${desc} ${kw}`
      const matches = terms.every(t => content.includes(t)) // Require all terms to match (AND)
      const typeMatch = !filters.type || d.type === filters.type
      const encMatch = filters.encrypted === undefined || d.encrypted === filters.encrypted
      const srcMatch = !filters.source || d.source === filters.source
      return matches && typeMatch && encMatch && srcMatch
    })
    return results.sort((a, b) => b.timestamp - a.timestamp) // Newest first
  } catch (error) {
    console.error('Error querying documents:', error)
    throw new Error(`Failed to query documents: ${error.message}`)
  }
}
