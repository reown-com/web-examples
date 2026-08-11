import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * Institutional-style sidebar navigation: vertical, icon + label, with an
 * active-item pill (custody-console look rather than a mobile tab bar).
 */
interface NavItem {
  href: string
  label: string
  icon?: string
  emoji?: string
  /** Extra path prefixes that should also mark this item active. */
  match?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Accounts', icon: '/icons/accounts-icon.svg', match: ['/account'] },
  { href: '/explore', label: 'Dapps', emoji: '🧭' },
  { href: '/walletconnect', label: 'Connect', icon: '/wallet-connect-logo.svg' },
  { href: '/sessions', label: 'Sessions', icon: '/icons/sessions-icon.svg', match: ['/session'] },
  { href: '/pairings', label: 'Pairings', icon: '/icons/pairings-icon.svg' },
  { href: '/settings', label: 'Settings', icon: '/icons/settings-icon.svg' }
]

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/') return pathname === '/' || pathname.startsWith('/account')
  if (pathname === item.href || pathname.startsWith(item.href + '/')) return true
  return (item.match ?? []).some(prefix => pathname === prefix || pathname.startsWith(prefix))
}

export default function Navigation() {
  const { pathname } = useRouter()

  return (
    <nav
      style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 20 }}
      data-testid="navigation"
    >
      {NAV_ITEMS.map(item => {
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            passHref
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                background: active ? '#eaf0ff' : 'transparent',
                color: active ? '#2E5CFF' : '#4a4f57',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLDivElement).style.background = '#f4f5f7'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {item.emoji ? (
                  <span style={{ fontSize: 17, opacity: active ? 1 : 0.75 }}>{item.emoji}</span>
                ) : (
                  <Image
                    alt={`${item.label} icon`}
                    src={item.icon!}
                    width={19}
                    height={19}
                    style={{
                      // Force the (light-on-dark) SVGs to a dark silhouette so
                      // they read on the white sidebar.
                      filter: 'brightness(0) saturate(0)',
                      opacity: active ? 0.85 : 0.5
                    }}
                  />
                )}
              </span>
              {item.label}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
