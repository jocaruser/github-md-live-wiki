import type { ReactNode } from 'react'

interface NoticeProps {
  title: string
  children?: ReactNode
  action?: { label: string; onClick: () => void }
}

export function Notice({ title, children, action }: NoticeProps) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{children}</div>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
