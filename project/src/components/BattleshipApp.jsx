import { useState, useEffect } from 'react'
import { Button, Input, Modal, Card, List, message, Space, Badge } from 'antd'
import { BattleshipGame } from '../entities/BattleshipGame'
import { BattleshipPlayer } from '../entities/BattleshipPlayer'
import GameBoard from './GameBoard'
import ShipPlacement from './ShipPlacement'
import GamePlay from './GamePlay'

const BattleshipApp = () => {
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [showNameModal, setShowNameModal] = useState(true)
  const [currentGame, setCurrentGame] = useState(null)
  const [availableGames, setAvailableGames] = useState([])
  const [gameState, setGameState] = useState('lobby') // lobby, placing_ships, playing, finished
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (currentPlayer) {
      loadAvailableGames()
      const interval = setInterval(loadAvailableGames, 3000)
      return () => clearInterval(interval)
    }
  }, [currentPlayer])

  const loadAvailableGames = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const response = await BattleshipGame.list()
      if (response.success) {
        const openGames = response.data.filter(game => 
          game.gameStatus === 'waiting' || 
          (game.gameStatus === 'placing_ships' && (game.player1Id === currentPlayer?.playerId || game.player2Id === currentPlayer?.playerId)) ||
          (game.gameStatus === 'playing' && (game.player1Id === currentPlayer?.playerId || game.player2Id === currentPlayer?.playerId))
        )
        setAvailableGames(openGames)
        
        // Check if player is in an active game
        const activeGame = openGames.find(game => 
          (game.player1Id === currentPlayer?.playerId || game.player2Id === currentPlayer?.playerId) &&
          game.gameStatus !== 'waiting'
        )
        if (activeGame && (!currentGame || currentGame._id !== activeGame._id)) {
          setCurrentGame(activeGame)
          if (activeGame.gameStatus === 'placing_ships') {
            setGameState('placing_ships')
          } else if (activeGame.gameStatus === 'playing') {
            setGameState('playing')
          }
        }
      }
    } catch (error) {
      console.error('Error loading games:', error)
    }
    setIsRefreshing(false)
  }

  const handleSetPlayerName = async () => {
    if (!playerName.trim()) {
      message.error('Please enter a valid name')
      return
    }

    try {
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const response = await BattleshipPlayer.create({
        playerId,
        playerName: playerName.trim(),
        gamesPlayed: 0,
        gamesWon: 0,
        isOnline: true
      })
      
      if (response.success) {
        setCurrentPlayer(response.data)
        setShowNameModal(false)
        message.success(`Welcome, ${playerName}!`)
      }
    } catch (error) {
      message.error('Error creating player profile')
    }
  }

  const createNewGame = async () => {
    if (!currentPlayer) return

    try {
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const response = await BattleshipGame.create({
        gameId,
        player1Id: currentPlayer.playerId,
        player1Name: currentPlayer.playerName,
        player1Board: Array(10).fill().map(() => Array(10).fill(0)),
        player1Ships: [],
        player2Id: null,
        player2Name: null,
        player2Board: Array(10).fill().map(() => Array(10).fill(0)),
        player2Ships: [],
        currentTurn: null,
        gameStatus: 'waiting',
        winner: null,
        moves: []
      })
      
      if (response.success) {
        setCurrentGame(response.data)
        message.success('Game created! Waiting for opponent...')
        loadAvailableGames()
      }
    } catch (error) {
      message.error('Error creating game')
    }
  }

  const joinGame = async (game) => {
    if (!currentPlayer || game.player2Id) return

    try {
      const response = await BattleshipGame.update(game._id, {
        player2Id: currentPlayer.playerId,
        player2Name: currentPlayer.playerName,
        gameStatus: 'placing_ships'
      })
      
      if (response.success) {
        setCurrentGame(response.data)
        setGameState('placing_ships')
        message.success(`Joined game against ${game.player1Name}!`)
      }
    } catch (error) {
      message.error('Error joining game')
    }
  }

  const handleShipsPlaced = async (ships) => {
    if (!currentGame || !currentPlayer) return

    const isPlayer1 = currentGame.player1Id === currentPlayer.playerId
    const updateData = isPlayer1 
      ? { player1Ships: ships }
      : { player2Ships: ships }

    // Check if both players have placed ships
    const bothReady = isPlayer1 
      ? ships.length > 0 && currentGame.player2Ships?.length > 0
      : currentGame.player1Ships?.length > 0 && ships.length > 0

    if (bothReady) {
      updateData.gameStatus = 'playing'
      updateData.currentTurn = currentGame.player1Id // Player 1 goes first
    }

    try {
      const response = await BattleshipGame.update(currentGame._id, updateData)
      if (response.success) {
        setCurrentGame(response.data)
        if (bothReady) {
          setGameState('playing')
          message.success('Both players ready! Game started!')
        } else {
          message.success('Ships placed! Waiting for opponent...')
        }
      }
    } catch (error) {
      message.error('Error updating game')
    }
  }

  const backToLobby = () => {
    setCurrentGame(null)
    setGameState('lobby')
    loadAvailableGames()
  }

  if (showNameModal) {
    return (
      <Modal
        title="Welcome to Battleship!"
        open={showNameModal}
        onOk={handleSetPlayerName}
        onCancel={() => setShowNameModal(false)}
        okText="Start Playing"
      >
        <div className="mb-4">
          <p className="mb-2">Enter your name to start playing:</p>
          <Input
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onPressEnter={handleSetPlayerName}
            maxLength={20}
          />
        </div>
      </Modal>
    )
  }

  if (gameState === 'placing_ships' && currentGame) {
    return (
      <div className="min-h-screen bg-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-6 text-blue-800">
            Place Your Ships
          </h1>
          <ShipPlacement 
            onShipsPlaced={handleShipsPlaced}
            onBack={backToLobby}
          />
        </div>
      </div>
    )
  }

  if (gameState === 'playing' && currentGame) {
    return (
      <div className="min-h-screen bg-blue-50 p-4">
        <GamePlay 
          game={currentGame}
          currentPlayer={currentPlayer}
          onGameEnd={backToLobby}
          onGameUpdate={setCurrentGame}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">
            🚢 Battleship Arena
          </h1>
          <p className="text-lg text-gray-600">
            Challenge your friends to epic naval battles!
          </p>
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <p className="text-sm text-gray-500">Playing as: <strong>{currentPlayer?.playerName}</strong></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card 
            title="Create New Game" 
            className="shadow-md"
            extra={<Button type="primary" onClick={createNewGame}>Create Game</Button>}
          >
            <p className="text-gray-600 mb-4">
              Start a new game and wait for a friend to join. Share your game with them!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">How to Play:</h4>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Place 5 ships on your 10x10 grid</li>
                <li>• Take turns firing at opponent's grid</li>
                <li>• First to sink all enemy ships wins!</li>
              </ul>
            </div>
          </Card>

          <Card 
            title={
              <Space>
                Available Games
                <Badge count={availableGames.length} showZero />
              </Space>
            } 
            className="shadow-md"
            extra={
              <Button 
                onClick={loadAvailableGames} 
                loading={isRefreshing}
                size="small"
              >
                Refresh
              </Button>
            }
          >
            {availableGames.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">🌊 No games available</p>
                <p className="text-sm">Create a new game to get started!</p>
              </div>
            ) : (
              <List
                dataSource={availableGames}
                renderItem={(game) => (
                  <List.Item
                    actions={[
                      game.gameStatus === 'waiting' && !game.player2Id ? (
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => joinGame(game)}
                          disabled={game.player1Id === currentPlayer?.playerId}
                        >
                          {game.player1Id === currentPlayer?.playerId ? 'Your Game' : 'Join'}
                        </Button>
                      ) : (
                        <Badge 
                          status={game.gameStatus === 'playing' ? 'processing' : 'default'} 
                          text={game.gameStatus}
                        />
                      )
                    ]}
                  >
                    <List.Item.Meta
                      title={`${game.player1Name} vs ${game.player2Name || 'Waiting...'}`}
                      description={
                        <span className="text-xs text-gray-500">
                          Game ID: {game.gameId.substring(0, 12)}...
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default BattleshipApp