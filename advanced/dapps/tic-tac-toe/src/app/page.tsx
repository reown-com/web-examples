'use client'
import { Box, Card, Inset, Text, Flex, Button, Tooltip } from '@radix-ui/themes'
import { ReloadIcon } from '@radix-ui/react-icons'
import Image from 'next/image'
import TicTacToeBoard from '@/components/TicTacToeBoard'
import { useTicTacToeContext } from '@/context/TicTacToeContextProvider'
import { useTicTacToeActions } from '@/hooks/useTicTacToeActions'

export default function Home() {
  const {
    gameStarted,
    loading,
    isWalletConnected,
    isWalletConnecting,
    grantedPermissions,
    setGrantedPermissions,
    setWCCosignerData,
    setGameStarted,
    setGameState
  } = useTicTacToeContext()

  const { startGame } = useTicTacToeActions()

  const button = (
    <Button
      size="4"
      className="hover:cursor-pointer"
      variant="classic"
      disabled={!isWalletConnected}
      onClick={startGame}
      loading={loading}
    >
      <ReloadIcon /> Start New Game
    </Button>
  )

  function resetGame() {
    setGrantedPermissions(undefined)
    setWCCosignerData(undefined)
    setGameStarted(false)
    setGameState(undefined)
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      {/* Navigation Bar */}
      <nav className="flex w-full bg-gray-800 text-white justify-center ">
        <div className="container flex w-full py-4 px-2 justify-between">
          <div className="flex justify-center">
            <h1 className="text-2xl ">Tic Tac Toe</h1>
          </div>

          <div className="flex justify-center gap-2 items-center">
            {isWalletConnecting ? (
              <Button color="blue" radius="full" disabled={true}>
                Connecting...
              </Button>
            ) : (
              <w3m-button label="Connect" />
            )}
            {grantedPermissions && (
              <Button
                className="hover:cursor-pointer "
                color="red"
                radius="full"
                onClick={resetGame}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex flex-col justify-center items-center gap-4 p-4 pt-0">
        <Text className="text-center mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
          Let&apos;s play the Tic-Tac-Toe Game!
        </Text>

        <Flex className="max-w-2xl mb-4">
          <Text className="text-center text-base sm:text-lg md:text-md">
            Players take turns placing their marks in empty squares. The first to align three marks
            in a row—vertically, horizontally, or diagonally—wins. If all squares are filled and no
            one has three in a row, the game ends in a tie.
          </Text>
        </Flex>
        {isWalletConnected ? button : <Tooltip content="Connect your wallet">{button}</Tooltip>}

        {gameStarted ? (
          <TicTacToeBoard />
        ) : (
          <Box className="w-full max-w-md">
            <Card size="2" className="border-8 border-white overflow-hidden">
              <Inset clip="padding-box" side="top" pb="0">
                <Image
                  src="/TicTacToeGame.png"
                  alt="TicTacToe Game"
                  width={400}
                  height={440}
                  className="w-full h-auto object-cover"
                />
              </Inset>
            </Card>
          </Box>
        )}
      </div>
    </main>
  )
}
