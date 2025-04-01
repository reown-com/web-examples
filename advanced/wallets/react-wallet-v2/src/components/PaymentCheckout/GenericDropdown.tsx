import { useEffect, useRef, useState } from 'react'
import { Text, Card } from '@nextui-org/react'

// Simple hook to detect clicks outside an element
const useClickAway = (onClickAway: () => void) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickAway()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClickAway])

  return ref
}
// Style variables
const styles = {
  dropdownContainer: {
    position: 'relative' as const
  },
  dropdownButton: {
    padding: '8px 16px',
    background: '$accents0',
    cursor: 'pointer'
  },
  cardBody: {
    overflow: 'visible' as const,
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '4px 0'
  },
  contentWrapper: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    width: '100%'
  },
  chevronContainer: {
    marginLeft: 'auto'
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: '4px 8px',
    boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.3)',
    maxHeight: '300px',
    overflow: 'auto' as const,
    backgroundColor: '#2a2a2a'
  },
  checkmark: {
    position: 'absolute' as const,
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#17c964',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: 'white',
    boxShadow: '0 2px 8px rgba(23, 201, 100, 0.5)'
  }
}

// Generic dropdown component
export default function GenericDropdown({
  items,
  selectedIndex,
  setSelectedIndex,
  renderItem,
  placeholder = 'Select an option',
  emptyMessage = 'No options available'
}: {
  items: any[]
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  renderItem: (item: any) => React.ReactNode
  placeholder?: string
  emptyMessage?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Reference to detect clicks outside dropdown
  const dropdownRef = useClickAway(() => {
    setIsOpen(false)
  })

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setIsOpen(false)
  }

  // Get style for dropdown item
  const getDropdownItemStyle = (isSelected: boolean, isLast: boolean) => ({
    cursor: 'pointer' as const,
    padding: '8px 4px',
    borderRadius: '8px',
    backgroundColor: isSelected ? 'rgba(23, 201, 100, 0.2)' : 'transparent',
    position: 'relative' as const,
    marginBottom: 0,
    borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '8px',
    marginTop: '8px',
    transition: 'all 0.2s ease'
  })

  // Handle hover effects
  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>, isSelected: boolean) => {
    if (!isSelected) {
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
    }
  }

  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>, isSelected: boolean) => {
    if (!isSelected) {
      e.currentTarget.style.backgroundColor = 'transparent'
    }
  }

  // Render chevron icon
  const renderChevron = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease'
      }}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  )

  // Render checkmark icon
  const renderCheckmark = () => (
    <div style={styles.checkmark}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  )

  return (
    <div ref={dropdownRef} style={styles.dropdownContainer}>
      {/* Dropdown Button */}
      <Card onClick={() => setIsOpen(!isOpen)} css={styles.dropdownButton}>
        <Card.Body css={styles.cardBody}>
          <div style={styles.contentWrapper}>
            {items.length > 0 && selectedIndex >= 0 ? (
              renderItem(items[selectedIndex])
            ) : (
              <Text size={14} css={{ color: '#aaaaaa' }}>
                {placeholder}
              </Text>
            )}
            <div style={styles.chevronContainer}>{renderChevron()}</div>
          </div>
        </Card.Body>
      </Card>

      {/* Dropdown Menu */}
      {isOpen && (
        <Card css={styles.dropdownMenu}>
          {items.length > 0 ? (
            items.map((item, idx) => {
              const isSelected = selectedIndex === idx
              const isLastItem = idx === items.length - 1

              return (
                <div
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  style={getDropdownItemStyle(isSelected, isLastItem)}
                  onMouseOver={e => handleMouseOver(e, isSelected)}
                  onMouseOut={e => handleMouseOut(e, isSelected)}
                >
                  {renderItem(item)}
                  {isSelected && renderCheckmark()}
                </div>
              )
            })
          ) : (
            <Text css={{ color: '$accents7', padding: '8px 4px' }}>{emptyMessage}</Text>
          )}
        </Card>
      )}
    </div>
  )
}
