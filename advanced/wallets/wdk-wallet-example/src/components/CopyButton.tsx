import { useState } from 'react'

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  return (
    <button
      className="icon-button"
      onClick={onCopy}
      title="Copy address"
      aria-label="Copy address"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
