import { TRANSLATION_LANGUAGES } from '../lib/translate'

interface LanguageSelectProps {
  lang: string
  onChange: (lang: string) => void
}

export function LanguageSelect({ lang, onChange }: LanguageSelectProps) {
  return (
    <select
      aria-label="Translate page"
      value={lang}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-slate-300 bg-transparent px-1.5 py-1 text-sm text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:[&>option]:bg-slate-800"
    >
      <option value="">Original</option>
      {TRANSLATION_LANGUAGES.map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ))}
    </select>
  )
}
