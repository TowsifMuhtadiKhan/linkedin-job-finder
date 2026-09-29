import type { KeyboardEvent } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Search, Sparkles, Plus } from 'lucide-react'
import { fetchKeywordSuggestions } from '../lib/keywordService'

interface Props {
  keywords?: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  category?: 'keyword' | 'location'
}

/**
 * Enhanced tag-chip input with live autocomplete & crowdsourced suggestions.
 */
export default function KeywordsInput({
  keywords = [],
  onChange,
  placeholder = 'Type keyword + Enter (e.g. React, Python...)',
  label = 'Keywords',
  disabled = false,
  category = 'keyword',
}: Props) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadSuggestions = useCallback(
    async (query: string) => {
      try {
        const list = await fetchKeywordSuggestions(query, category)
        // Filter out already selected keywords
        const existingLower = new Set(keywords.map((k) => k.toLowerCase()))
        const filtered = list.filter((item) => !existingLower.has(item.toLowerCase()))
        setSuggestions(filtered)
      } catch {
        setSuggestions([])
      }
    },
    [category, keywords]
  )

  useEffect(() => {
    if (isOpen) {
      loadSuggestions(inputValue)
    }
  }, [inputValue, isOpen, loadSuggestions])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addKeyword = (raw: string) => {
    const additions = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (additions.length) {
      onChange([...new Set([...keywords, ...additions])])
    }
    setInputValue('')
    setSelectedIndex(-1)
  }

  const removeKeyword = (kw: string) => onChange(keywords.filter((k) => k !== kw))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) return
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addKeyword(suggestions[selectedIndex])
      } else if (inputValue.trim()) {
        addKeyword(inputValue)
      } else if (keywords.length > 0) {
        inputRef.current?.form?.requestSubmit()
      }
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSelectedIndex(-1)
    } else if (e.key === 'Backspace' && !inputValue && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1])
    }
  }

  const handleSelectSuggestion = (item: string) => {
    addKeyword(item)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="min-h-[42px] w-full border border-gray-300 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#0A66C2] focus-within:border-transparent transition-all bg-white"
        onClick={() => {
          inputRef.current?.focus()
          setIsOpen(true)
        }}
      >
        {keywords.map((kw) => (
          <span
            key={kw}
            className="flex items-center gap-1 bg-[#F0F7FF] text-[#004182] text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {kw}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${kw}`}
              onClick={(e) => {
                e.stopPropagation()
                removeKeyword(kw)
              }}
              className="hover:text-red-500 transition-colors ml-0.5"
            >
              <X size={11} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          aria-label={label}
          disabled={disabled}
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) {
              addKeyword(inputValue)
            }
          }}
          className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
          placeholder={keywords.length === 0 ? placeholder : 'Add another...'}
        />
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between border-b border-gray-100">
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-[#0A66C2]" />
              {inputValue.trim() ? 'Matching Suggestions' : 'Popular Suggestions'}
            </span>
            <span className="text-[10px] text-gray-400 font-normal">Press Enter or click to add</span>
          </div>

          <ul className="py-1" role="listbox">
            {suggestions.map((item, index) => {
              const isSelected = index === selectedIndex
              return (
                <li
                  key={item}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // Prevent blur so click handler finishes cleanly
                    e.preventDefault()
                    handleSelectSuggestion(item)
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#F0F7FF] text-[#004182]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Search size={13} className={isSelected ? 'text-[#0A66C2]' : 'text-gray-400'} />
                    <span className="truncate">{item}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    <Plus size={12} /> Add
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
