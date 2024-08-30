import { useCustomToast } from '@/hooks/useCustomToast'
import { GameState, useTicTacToeContext } from '@/context/TicTacToeContextProvider'
import {
  decodeUncompressedPublicKey,
  encodePublicKeyToDID,
  hexStringToBase64
} from '@/utils/EncodingUtils'
import { walletActionsErc7715 } from 'viem/experimental'
import { createPublicClient, custom } from 'viem'
import { getTicTacToeAsyncPermissions } from '@/utils/TicTacToeUtils'
import { WalletConnectCosigner } from '@/utils/WalletConnectCosignerUtils'

export function useTicTacToeActions() {
  const {
    gameState,
    setGameState,
    gameStarted,
    setGameStarted,
    setLoading,
    setError,
    setGrantedPermissions,
    setWCCosignerData,
    grantedPermissions,
    wcCosignerData,
    address,
    chain,
    provider
  } = useTicTacToeContext()
  const customToast = useCustomToast()

  async function handleMove(gameId: string, index: number) {
    if (!gameStarted || !gameState || gameState.board[index] || gameState.winner) {
      return
    }
    if (!grantedPermissions) {
      throw new Error('Permissions not found')
    }
    if (!wcCosignerData) {
      throw new Error('Missing Wallet Connect Cosigner data')
    }
    // Create a temporary state copy
    const tempState = { ...gameState }
    const tempBoard = [...gameState.board]

    // Determine the current player's symbol
    const currentPlayer = gameState.isXNext ? 'X' : 'O'

    // Update the temporary board with the current player's move
    tempBoard[index] = currentPlayer

    // Update the temporary state
    tempState.board = tempBoard
    tempState.isXNext = !gameState.isXNext

    // Optimistically update the UI
    setGameState(tempState)
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/game/make-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId,
          position: index,
          permissions: grantedPermissions,
          pci: wcCosignerData.pci
        })
      })

      const data = await response.json()
      if (response.ok) {
        setGameState(data.gameState as GameState)
      } else {
        const errorMessage = data?.message || 'Error making move'
        setError(errorMessage)
      }
    } catch (e) {
      setError('Error making move')
      console.warn('Error making move:', e)
    } finally {
      setLoading(false)
    }
  }

  async function startGame() {
    setLoading(true)
    setError(null)
    if (!chain || !address || !provider) {
      throw new Error('Wallet not connected')
    }
    const caip10Address = `eip155:${chain?.id}:${address}`

    try {
      const getDappKeyResponse = await fetch('/api/signer', {
        method: 'GET'
      })
      const dappSignerData = await getDappKeyResponse.json()
      const dAppECDSAPublicKey = dappSignerData.key
      const walletConnectCosigner = new WalletConnectCosigner()
      const addPermissionResponse = await walletConnectCosigner.addPermission(caip10Address, {
        permissionType: 'tic-tac-toe-move',
        data: '',
        onChainValidated: false,
        required: true
      })
      const cosignerPublicKey = decodeUncompressedPublicKey(addPermissionResponse.key)
      const dAppSecp256k1DID = encodePublicKeyToDID(dAppECDSAPublicKey, 'secp256k1')
      const coSignerSecp256k1DID = encodePublicKeyToDID(cosignerPublicKey, 'secp256k1')

      const publicClient = createPublicClient({
        chain,
        transport: custom(provider)
      }).extend(walletActionsErc7715())

      const samplePermissions = getTicTacToeAsyncPermissions([
        coSignerSecp256k1DID,
        dAppSecp256k1DID
      ])
      customToast('Requesting permissions from wallet', { autoClose: 3000 })
      const approvedPermissions = await publicClient.grantPermissions(samplePermissions)
      if (!approvedPermissions) {
        throw new Error('Failed to obtain permissions')
      }

      await walletConnectCosigner.updatePermissionsContext(caip10Address, {
        pci: addPermissionResponse.pci,
        context: {
          expiry: approvedPermissions.expiry,
          signer: {
            type: 'tic-tac-toe-move',
            data: {
              ids: [addPermissionResponse.key, hexStringToBase64(dAppECDSAPublicKey)]
            }
          },
          signerData: {
            userOpBuilder: approvedPermissions.signerData?.userOpBuilder!
          },
          permissionsContext: approvedPermissions.permissionsContext,
          factory: approvedPermissions.factory || '',
          factoryData: approvedPermissions.factoryData || ''
        }
      })
      customToast('Setting up the new Tic Tac Toe Board', { autoClose: 3000 })
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: approvedPermissions,
          pci: addPermissionResponse.pci
        })
      })
      const data = await response.json()
      if (response.ok) {
        setWCCosignerData(addPermissionResponse)
        setGrantedPermissions(approvedPermissions)
        setGameState(data as GameState)
        setGameStarted(true)
        customToast('Game ready to play', { autoClose: 3000 })
      } else {
        const errorMessage = data?.message || 'Error starting game'
        setError(errorMessage)
      }
    } catch (e) {
      setError('Error starting game')
      console.warn('Error starting game:', e)
    } finally {
      setLoading(false)
    }
  }

  return {
    handleMove,
    startGame
  }
}
