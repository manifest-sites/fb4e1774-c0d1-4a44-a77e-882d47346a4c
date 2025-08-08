import { useState, useEffect } from 'react'
import { Button, Card, message, Badge, Modal } from 'antd'
import { BattleshipGame } from '../entities/BattleshipGame'
import GameBoard from './GameBoard'

const GamePlay = ({ game, currentPlayer, onGameEnd, onGameUpdate }) => {
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [gameState, setGameState] = useState(game)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const isPlayer1 = currentPlayer.playerId === game.player1Id
  const opponent = isPlayer1 ? 
    { id: game.player2Id, name: game.player2Name } : 
    { id: game.player1Id, name: game.player1Name }

  useEffect(() => {
    setGameState(game)
    setIsMyTurn(game.currentTurn === currentPlayer.playerId)
  }, [game, currentPlayer.playerId])

  useEffect(() => {
    const interval = setInterval(refreshGame, 2000)
    return () => clearInterval(interval)
  }, [])

  const refreshGame = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    
    try {
      const response = await BattleshipGame.get(gameState._id)
      if (response.success && response.data) {
        setGameState(response.data)
        onGameUpdate(response.data)
        setIsMyTurn(response.data.currentTurn === currentPlayer.playerId)
        
        if (response.data.gameStatus === 'finished') {
          showGameEndModal(response.data)
        }
      }
    } catch (error) {
      console.error('Error refreshing game:', error)
    }
    setIsRefreshing(false)
  }

  const showGameEndModal = (finalGameState) => {
    const won = finalGameState.winner === currentPlayer.playerId
    
    Modal.info({
      title: won ? '🎉 Victory!' : '💥 Game Over',
      content: (
        <div className="text-center py-4">
          <div className="text-6xl mb-4">
            {won ? '🏆' : '💀'}
          </div>
          <p className="text-lg">
            {won ? 
              `Congratulations! You defeated ${opponent.name}!` :
              `${opponent.name} has sunk all your ships!`
            }
          </p>
        </div>
      ),
      okText: 'Back to Lobby',
      onOk: onGameEnd
    })
  }

  const makeMove = async (row, col) => {
    if (!isMyTurn || gameState.gameStatus !== 'playing') {
      message.warning("It's not your turn!")
      return
    }

    const opponentBoard = isPlayer1 ? gameState.player2Board : gameState.player1Board
    const opponentShips = isPlayer1 ? gameState.player2Ships : gameState.player1Ships

    // Check if cell already attacked
    if (opponentBoard[row][col] !== 0) {
      message.warning('You already attacked this position!')
      return
    }

    // Check if there's a ship at this position
    const hitShip = opponentShips?.find(ship => 
      ship.positions.some(pos => pos.row === row && pos.col === col)
    )

    const newBoard = opponentBoard.map(r => [...r])
    newBoard[row][col] = hitShip ? 2 : 1 // 2 = hit, 1 = miss

    // Update ship hits if hit
    let updatedOpponentShips = opponentShips
    let sunkShips = []
    if (hitShip) {
      updatedOpponentShips = opponentShips.map(ship => {
        if (ship === hitShip) {
          const newHits = ship.hits + 1
          const updatedShip = { ...ship, hits: newHits }
          if (newHits >= ship.length) {
            sunkShips.push(updatedShip)
          }
          return updatedShip
        }
        return ship
      })
    }

    // Check if all opponent ships are sunk
    const allShipsSunk = updatedOpponentShips.every(ship => ship.hits >= ship.length)
    
    // Create move record
    const move = {
      player: currentPlayer.playerId,
      row,
      col,
      hit: !!hitShip,
      timestamp: new Date().toISOString()
    }

    // Prepare update data
    const updateData = {
      moves: [...(gameState.moves || []), move]
    }

    if (isPlayer1) {
      updateData.player2Board = newBoard
      updateData.player2Ships = updatedOpponentShips
    } else {
      updateData.player1Board = newBoard
      updateData.player1Ships = updatedOpponentShips
    }

    if (allShipsSunk) {
      updateData.gameStatus = 'finished'
      updateData.winner = currentPlayer.playerId
    } else {
      // Switch turns (player gets another turn if they hit)
      updateData.currentTurn = hitShip ? currentPlayer.playerId : opponent.id
    }

    try {
      const response = await BattleshipGame.update(gameState._id, updateData)
      if (response.success) {
        setGameState(response.data)
        onGameUpdate(response.data)
        
        if (hitShip) {
          if (sunkShips.length > 0) {
            message.success(`💥 Hit and sunk ${sunkShips[0].type}! You get another turn!`)
          } else {
            message.success('💥 Hit! You get another turn!')
          }
          setIsMyTurn(true)
        } else {
          message.info('💦 Miss! Your opponent\'s turn.')
          setIsMyTurn(false)
        }

        if (allShipsSunk) {
          setTimeout(() => showGameEndModal(response.data), 1000)
        }
      }
    } catch (error) {
      message.error('Error making move')
      console.error(error)
    }
  }

  const getMyBoard = () => isPlayer1 ? gameState.player1Board : gameState.player2Board
  const getMyShips = () => isPlayer1 ? gameState.player1Ships : gameState.player2Ships
  const getOpponentBoard = () => isPlayer1 ? gameState.player2Board : gameState.player1Board
  const getOpponentShips = () => isPlayer1 ? gameState.player2Ships : gameState.player1Ships

  const getShipStatus = (ships) => {
    if (!ships) return { total: 0, sunk: 0 }
    return {
      total: ships.length,
      sunk: ships.filter(ship => ship.hits >= ship.length).length
    }
  }

  const myShipStatus = getShipStatus(getMyShips())
  const opponentShipStatus = getShipStatus(getOpponentShips())

  return (
    <div className="max-w-7xl mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">
          ⚔️ Battle in Progress
        </h1>
        <div className="bg-white p-4 rounded-lg shadow-sm max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <div className="text-left">
              <p className="font-semibold">{currentPlayer.playerName} (You)</p>
              <p className="text-sm text-gray-600">
                Ships: {myShipStatus.total - myShipStatus.sunk}/{myShipStatus.total} remaining
              </p>
            </div>
            <div className="text-center">
              <Badge
                status={isMyTurn ? 'processing' : 'default'}
                text={isMyTurn ? 'Your Turn' : `${opponent.name}'s Turn`}
                className="font-semibold"
              />
            </div>
            <div className="text-right">
              <p className="font-semibold">{opponent.name}</p>
              <p className="text-sm text-gray-600">
                Ships: {opponentShipStatus.total - opponentShipStatus.sunk}/{opponentShipStatus.total} remaining
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Boards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
        {/* Opponent's Board (Attack Here) */}
        <Card 
          title={
            <div className="flex justify-between items-center">
              <span>🎯 Attack {opponent.name}</span>
              <Badge 
                count={`${opponentShipStatus.sunk}/${opponentShipStatus.total} sunk`}
                style={{ backgroundColor: '#f50' }}
              />
            </div>
          }
          className="shadow-lg"
        >
          <GameBoard
            board={getOpponentBoard()}
            ships={getOpponentShips() || []}
            showShips={false} // Don't show opponent's ships
            isInteractive={isMyTurn && gameState.gameStatus === 'playing'}
            onCellClick={makeMove}
            title=""
          />
          {!isMyTurn && gameState.gameStatus === 'playing' && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">⏳ Waiting for {opponent.name} to make their move...</p>
            </div>
          )}
        </Card>

        {/* Your Board */}
        <Card 
          title={
            <div className="flex justify-between items-center">
              <span>🛡️ Your Fleet</span>
              <Badge 
                count={`${myShipStatus.sunk}/${myShipStatus.total} sunk`}
                style={{ backgroundColor: myShipStatus.sunk > 0 ? '#f50' : '#52c41a' }}
              />
            </div>
          }
          className="shadow-lg"
        >
          <GameBoard
            board={getMyBoard()}
            ships={getMyShips() || []}
            showShips={true} // Show your own ships
            isInteractive={false}
            title=""
          />
        </Card>
      </div>

      {/* Game Controls */}
      <div className="text-center">
        <div className="bg-white p-4 rounded-lg shadow-sm max-w-md mx-auto">
          <div className="space-y-3">
            <Button 
              onClick={refreshGame}
              loading={isRefreshing}
              className="w-full"
            >
              🔄 Refresh Game
            </Button>
            <Button 
              onClick={onGameEnd}
              className="w-full"
            >
              ← Back to Lobby
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Moves */}
      {gameState.moves && gameState.moves.length > 0 && (
        <div className="mt-6">
          <Card title="📋 Recent Moves" className="max-w-2xl mx-auto">
            <div className="max-h-40 overflow-y-auto space-y-2">
              {gameState.moves.slice(-10).reverse().map((move, index) => {
                const isMyMove = move.player === currentPlayer.playerId
                const playerName = isMyMove ? 'You' : opponent.name
                const coordinate = `${String.fromCharCode(65 + move.row)}${move.col + 1}`
                
                return (
                  <div key={index} className={`p-2 rounded text-sm ${isMyMove ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <span className="font-semibold">{playerName}</span> attacked {coordinate} - 
                    <span className={`ml-1 font-semibold ${move.hit ? 'text-red-600' : 'text-blue-600'}`}>
                      {move.hit ? '💥 HIT!' : '💦 Miss'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default GamePlay