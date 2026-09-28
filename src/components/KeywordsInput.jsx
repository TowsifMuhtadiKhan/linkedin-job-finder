import { useState, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Tag-chip keyword input.
 * Press Enter or comma to add a keyword.
 * Press Backspace to remove the last tag.
 */
export default function KeywordsInput({ keywords = [], onChange }) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const addKeyword = (raw) => {
    const trimmed = raw.trim().replace(/,$/, '').trim()
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed])
    }
    setInputValue('')
  }

  const removeKeyword = (kw) => onChange(keywords.filter((k) => k !== kw))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) addKeyword(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1])
    }
  }

  return (
    <div
      className="min-h-[42px] w-full border border-gray-300 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#0077B5] focus-within:border-transparent transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {keywords.map((kw) => (
        <span
          key={kw}
          className="flex items-center gap-1 bg-[#E8F4FD] text-[#004182] text-xs font-medium px-2.5 py-1 rounded-full"
        >
          {kw}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeKeyword(kw) }}
            className="hover:text-red-500 transition-colors ml-0.5"
          >
            <X size={11} />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addKeyword(inputValue) }}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
        placeholder={
          keywords.length === 0
            ? 'Type keyword + Enter  (e.g. React, Python...)'
            : 'Add another...'
        }
      />
    </div>
  )
}
