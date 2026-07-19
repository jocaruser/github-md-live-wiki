import type { NavItem } from '../lib/nav'

interface SidebarProps {
  nav: NavItem[]
  currentPath: string
  linkFor: (path: string) => string
  onLinkClick: () => void
  open: boolean
}

function ItemList({
  items,
  currentPath,
  linkFor,
}: {
  items: NavItem[]
  currentPath: string
  linkFor: (path: string) => string
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) =>
        item.kind === 'page' ? (
          <li key={item.path}>
            <a
              href={linkFor(item.path)}
              aria-current={item.path === currentPath ? 'page' : undefined}
              className={`block rounded px-2 py-1 text-sm ${
                item.path === currentPath
                  ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {item.title}
            </a>
          </li>
        ) : (
          <li key={`${item.title}:${item.indexPath ?? ''}`} className="pt-3">
            {item.indexPath ? (
              <a
                href={linkFor(item.indexPath)}
                aria-current={item.indexPath === currentPath ? 'page' : undefined}
                className={`block px-2 text-xs font-semibold uppercase tracking-wide ${
                  item.indexPath === currentPath
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {item.title}
              </a>
            ) : (
              <span className="block px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {item.title}
              </span>
            )}
            <div className="mt-1 border-l border-slate-200 pl-2 dark:border-slate-700">
              <ItemList items={item.items} currentPath={currentPath} linkFor={linkFor} />
            </div>
          </li>
        )
      )}
    </ul>
  )
}

export function Sidebar({ nav, currentPath, linkFor, onLinkClick, open }: SidebarProps) {
  return (
    <aside
      onClick={onLinkClick}
      className={`w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${
        open
          ? 'fixed inset-y-14 left-0 z-30 block shadow-xl'
          : 'hidden md:block'
      }`}
    >
      <nav aria-label="Specs">
        <ItemList items={nav} currentPath={currentPath} linkFor={linkFor} />
      </nav>
    </aside>
  )
}
