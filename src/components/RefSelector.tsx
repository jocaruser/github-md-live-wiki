import { useState, type FormEvent } from 'react'
import { LOCAL_REF } from '../config'
import type { RefInfo } from '../lib/github'

interface RefSelectorProps {
  current: string
  defaultRef: string
  tags: RefInfo[]
  branches: RefInfo[]
  localAvailable: boolean
  onSelect: (ref: string) => void
}

function shorten(ref: string): string {
  return /^[0-9a-f]{12,40}$/i.test(ref) ? ref.slice(0, 12) : ref
}

export function RefSelector({
  current,
  defaultRef,
  tags,
  branches,
  localAvailable,
  onSelect,
}: RefSelectorProps) {
  const [open, setOpen] = useState(false)
  const [sha, setSha] = useState('')

  const label =
    current === LOCAL_REF
      ? 'local'
      : current === defaultRef
        ? `latest (${defaultRef})`
        : shorten(current)

  const pick = (ref: string) => {
    setOpen(false)
    setSha('')
    onSelect(ref)
  }

  const submitSha = (event: FormEvent) => {
    event.preventDefault()
    if (sha.trim()) pick(sha.trim())
  }

  const itemClass = (active: boolean) =>
    `block w-full truncate rounded px-2 py-1 text-left text-sm ${
      active
        ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
    }`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
      >
        <span className="max-w-40 truncate">{label}</span>
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close version menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 z-40 mt-1 max-h-96 w-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
            {localAvailable && (
              <button type="button" onClick={() => pick(LOCAL_REF)} className={itemClass(current === LOCAL_REF)}>
                local (mounted directory)
              </button>
            )}
            <button type="button" onClick={() => pick(defaultRef)} className={itemClass(current === defaultRef)}>
              latest ({defaultRef})
            </button>
            <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Releases
            </p>
            {tags.length === 0 && <p className="px-2 text-sm text-slate-400">No releases yet</p>}
            {tags.map((tag) => (
              <button key={tag.name} type="button" onClick={() => pick(tag.name)} className={itemClass(current === tag.name)}>
                {tag.name}
              </button>
            ))}
            <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Branches
            </p>
            {branches.length === 0 && <p className="px-2 text-sm text-slate-400">No branches found</p>}
            {branches.map((branch) => (
              <button
                key={branch.name}
                type="button"
                onClick={() => pick(branch.name)}
                className={itemClass(current === branch.name)}
              >
                {branch.name}
              </button>
            ))}
            <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Any commit
            </p>
            <form onSubmit={submitSha} className="flex gap-1 px-2 pb-1">
              <input
                value={sha}
                onChange={(event) => setSha(event.target.value)}
                placeholder="commit id"
                aria-label="Commit id"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="submit"
                className="rounded bg-indigo-600 px-2 py-1 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Go
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
