import { useMemo, useState } from 'react'
import type { SearchHit } from '../lib/search'

interface SearchBoxProps {
  search: (query: string) => SearchHit[]
  onNavigate: (path: string) => void
}

export function SearchBox({ search, onNavigate }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => search(query), [search, query])

  const go = (path: string) => {
    setQuery('')
    onNavigate(path)
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && hits.length > 0) go(hits[0].path)
          if (event.key === 'Escape') setQuery('')
        }}
        placeholder="Search pages…"
        aria-label="Search pages"
        className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm placeholder:text-slate-400 focus:w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 sm:w-44 transition-all"
      />
      {query && (
        <div className="absolute right-0 z-40 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {hits.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">No matches</p>}
          {hits.map((hit) => (
            <button
              key={hit.path}
              type="button"
              onClick={() => go(hit.path)}
              className="block w-full rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="block truncate font-medium">{hit.title}</span>
              <span className="block truncate text-xs text-slate-400">{hit.path}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
