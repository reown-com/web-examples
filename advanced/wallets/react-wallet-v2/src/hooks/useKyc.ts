import { useCallback, useState, useMemo } from 'react'
import { useSnapshot } from 'valtio'
import SettingsStore, { KycStatus } from '@/store/SettingsStore'
import ModalStore from '@/store/ModalStore'

interface UseKycReturn {
  kycStatus: KycStatus
  isLoading: boolean
  error: string | null
  checkKycStatus: (address?: string) => Promise<KycStatus>
  initiateKyc: () => void
  isKycRequired: boolean
  isKycApproved: boolean
  selectedAddress: string
  getKycStatusForAddress: (address: string) => KycStatus
}

export default function useKyc(): UseKycReturn {
  const { selectedKycAddress, kycStatusByAddress, eip155Address } = useSnapshot(SettingsStore.state)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use selectedKycAddress if set, otherwise fall back to eip155Address
  const activeAddress = selectedKycAddress || eip155Address

  // Get current KYC status for the active address
  const kycStatus = useMemo((): KycStatus => {
    if (!activeAddress) return 'none'
    return (kycStatusByAddress as Record<string, KycStatus>)[activeAddress.toLowerCase()] || 'none'
  }, [activeAddress, kycStatusByAddress])

  /**
   * Get KYC status for a specific address
   */
  const getKycStatusForAddress = useCallback(
    (address: string): KycStatus => {
      return (kycStatusByAddress as Record<string, KycStatus>)[address.toLowerCase()] || 'none'
    },
    [kycStatusByAddress]
  )

  /**
   * Check the current KYC status from Sumsub
   */
  const checkKycStatus = useCallback(
    async (address?: string): Promise<KycStatus> => {
      const targetAddress = address || activeAddress
      if (!targetAddress) {
        setError('No wallet address available')
        return 'none'
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `/api/sumsub/status?address=${encodeURIComponent(targetAddress)}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to check KYC status')
        }

        const data = await response.json()
        const newStatus: KycStatus = data.status

        // Update the store with the new status for this specific address
        SettingsStore.setKycStatusForAddress(targetAddress, newStatus)

        return newStatus
      } catch (err) {
        console.error('Error checking KYC status:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to check KYC status'
        setError(errorMessage)
        return kycStatus // Return current status on error
      } finally {
        setIsLoading(false)
      }
    },
    [activeAddress, kycStatus]
  )

  /**
   * Open the KYC verification modal
   */
  const initiateKyc = useCallback(() => {
    ModalStore.open('KycVerificationModal', {})
  }, [])

  // Computed properties
  const isKycRequired = kycStatus !== 'approved'
  const isKycApproved = kycStatus === 'approved'

  return {
    kycStatus,
    isLoading,
    error,
    checkKycStatus,
    initiateKyc,
    isKycRequired,
    isKycApproved,
    selectedAddress: activeAddress,
    getKycStatusForAddress
  }
}
