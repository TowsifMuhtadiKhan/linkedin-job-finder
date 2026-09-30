import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  disabled?: boolean
  size?: 'default' | 'search'
  placeholder?: string
  icon?: React.ReactNode
  className?: string
  menuWidth?: string
  ariaLabel?: string
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  icon,
  className = '',
  menuWidth = 'w-44',
  ariaLabel,
  disabled = false,
  size = 'default',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder || options[0]?.label || ''
  const isSelectedActive = Boolean(value)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen && !disabled}
        disabled={disabled}
        aria-label={ariaLabel || displayLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${size === 'search' ? 'h-[42px] w-full md:w-auto' : 'h-8'} px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-[#0A66C2] ring-2 ring-[#0A66C2]/15 bg-white text-[#0A66C2]'
            : isSelectedActive
            ? 'border-blue-200 bg-blue-50/70 text-[#0A66C2] font-semibold hover:border-blue-300'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
        }`}
      >
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className="truncate max-w-[130px]">{displayLabel}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0A66C2]' : isSelectedActive ? 'text-[#0A66C2]' : 'text-gray-400'
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && !disabled && (
        <div
          role="listbox"
          className={`absolute left-0 mt-1.5 ${menuWidth} bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150`}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-[#0A66C2] font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && (
                  <Check size={14} className="text-[#0A66C2] shrink-0 ml-2" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
