import { useState } from 'react'
import { Button, Card, message, Select, Space } from 'antd'
import GameBoard from './GameBoard'

const SHIP_TYPES = [
  { name: 'Carrier', length: 5, count: 1, emoji: '🚢' },
  { name: 'Battleship', length: 4, count: 1, emoji: '⛵' },
  { name: 'Cruiser', length: 3, count: 1, emoji: '🛥️' },
  { name: 'Submarine', length: 3, count: 1, emoji: '🚤' },
  { name: 'Destroyer', length: 2, count: 1, emoji: '🛶' }
]

const ShipPlacement = ({ onShipsPlaced, onBack }) => {
  const [board, setBoard] = useState(Array(10).fill().map(() => Array(10).fill(0)))
  const [ships, setShips] = useState([])
  const [selectedShip, setSelectedShip] = useState(SHIP_TYPES[0])
  const [orientation, setOrientation] = useState('horizontal')
  const [hoveredCells, setHoveredCells] = useState([])

  const getShipsToPlace = () => {
    return SHIP_TYPES.filter(shipType => {
      const placedCount = ships.filter(ship => ship.type === shipType.name).length
      return placedCount < shipType.count
    })
  }

  const getShipPositions = (row, col, length, orientation) => {
    const positions = []
    
    if (orientation === 'horizontal') {
      if (col + length > 10) return null // Out of bounds
      for (let i = 0; i < length; i++) {
        positions.push({ row, col: col + i })
      }
    } else {
      if (row + length > 10) return null // Out of bounds
      for (let i = 0; i < length; i++) {
        positions.push({ row: row + i, col })
      }
    }
    
    return positions
  }

  const isValidPlacement = (positions) => {
    if (!positions) return false
    
    // Check if any position is occupied or adjacent to another ship
    for (const pos of positions) {
      // Check if position is occupied
      if (board[pos.row][pos.col] !== 0) return false
      
      // Check adjacent cells for other ships
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const newRow = pos.row + dr
          const newCol = pos.col + dc
          
          if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
            if (board[newRow][newCol] === 1) return false
          }
        }
      }
    }
    
    return true
  }

  const handleCellClick = (row, col) => {
    if (getShipsToPlace().length === 0) return
    
    const positions = getShipPositions(row, col, selectedShip.length, orientation)
    
    if (!isValidPlacement(positions)) {
      message.error('Invalid ship placement! Ships must not touch each other.')
      return
    }

    // Place the ship
    const newBoard = board.map(r => [...r])
    positions.forEach(pos => {
      newBoard[pos.row][pos.col] = 1
    })

    const newShip = {
      type: selectedShip.name,
      length: selectedShip.length,
      positions,
      orientation,
      hits: 0
    }

    setBoard(newBoard)
    setShips([...ships, newShip])

    // Auto-select next ship type
    const remainingShips = getShipsToPlace().filter(ship => 
      ship.name !== selectedShip.name || 
      ships.filter(s => s.type === ship.name).length + 1 < ship.count
    )
    
    if (remainingShips.length > 0) {
      setSelectedShip(remainingShips[0])
    }
    
    message.success(`${selectedShip.name} placed!`)
  }

  const handleCellHover = (row, col) => {
    if (getShipsToPlace().length === 0) return
    
    const positions = getShipPositions(row, col, selectedShip.length, orientation)
    if (positions && isValidPlacement(positions)) {
      setHoveredCells(positions)
    } else {
      setHoveredCells([])
    }
  }

  const clearBoard = () => {
    setBoard(Array(10).fill().map(() => Array(10).fill(0)))
    setShips([])
    setSelectedShip(SHIP_TYPES[0])
    setHoveredCells([])
    message.info('Board cleared')
  }

  const randomPlacement = () => {
    let newBoard = Array(10).fill().map(() => Array(10).fill(0))
    let newShips = []

    for (const shipType of SHIP_TYPES) {
      for (let i = 0; i < shipType.count; i++) {
        let placed = false
        let attempts = 0
        
        while (!placed && attempts < 100) {
          const row = Math.floor(Math.random() * 10)
          const col = Math.floor(Math.random() * 10)
          const orient = Math.random() > 0.5 ? 'horizontal' : 'vertical'
          
          const positions = getShipPositions(row, col, shipType.length, orient)
          
          if (positions && isValidPlacement(positions, newBoard, newShips)) {
            positions.forEach(pos => {
              newBoard[pos.row][pos.col] = 1
            })
            
            newShips.push({
              type: shipType.name,
              length: shipType.length,
              positions,
              orientation: orient,
              hits: 0
            })
            
            placed = true
          }
          attempts++
        }
      }
    }

    setBoard(newBoard)
    setShips(newShips)
    message.success('Ships placed randomly!')
  }

  const isValidPlacement2 = (positions, testBoard, testShips) => {
    if (!positions) return false
    
    for (const pos of positions) {
      if (testBoard[pos.row][pos.col] !== 0) return false
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const newRow = pos.row + dr
          const newCol = pos.col + dc
          
          if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
            if (testBoard[newRow][newCol] === 1) return false
          }
        }
      }
    }
    
    return true
  }

  const confirmPlacement = () => {
    if (ships.length === 5) {
      onShipsPlaced(ships)
    } else {
      message.error('Please place all ships before continuing!')
    }
  }

  const shipsToPlace = getShipsToPlace()
  const allShipsPlaced = ships.length === 5

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ship Selection Panel */}
        <Card title="Ship Placement" className="lg:col-span-1">
          <div className="space-y-4">
            {allShipsPlaced ? (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 font-semibold mb-3">All ships placed! ✅</p>
                <Button 
                  type="primary" 
                  size="large"
                  onClick={confirmPlacement}
                  className="w-full"
                >
                  Ready to Battle!
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Next Ship to Place:
                  </label>
                  <Select
                    value={selectedShip?.name}
                    onChange={(value) => setSelectedShip(SHIP_TYPES.find(s => s.name === value))}
                    className="w-full"
                    disabled={shipsToPlace.length === 0}
                  >
                    {shipsToPlace.map((ship) => (
                      <Select.Option key={ship.name} value={ship.name}>
                        {ship.emoji} {ship.name} ({ship.length} cells)
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Orientation:
                  </label>
                  <Select
                    value={orientation}
                    onChange={setOrientation}
                    className="w-full"
                  >
                    <Select.Option value="horizontal">Horizontal →</Select.Option>
                    <Select.Option value="vertical">Vertical ↓</Select.Option>
                  </Select>
                </div>
              </>
            )}

            <div className="border-t pt-4 space-y-2">
              <h4 className="font-semibold text-gray-700">Fleet Status:</h4>
              {SHIP_TYPES.map((shipType) => {
                const placedCount = ships.filter(ship => ship.type === shipType.name).length
                return (
                  <div key={shipType.name} className="flex justify-between items-center text-sm">
                    <span>{shipType.emoji} {shipType.name}</span>
                    <span className={placedCount === shipType.count ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                      {placedCount}/{shipType.count}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Button 
                onClick={randomPlacement}
                className="w-full"
                disabled={allShipsPlaced}
              >
                🎲 Random Placement
              </Button>
              <Button 
                onClick={clearBoard}
                className="w-full"
              >
                🗑️ Clear Board
              </Button>
              <Button 
                onClick={onBack}
                className="w-full"
              >
                ← Back to Lobby
              </Button>
            </div>
          </div>
        </Card>

        {/* Game Board */}
        <div className="lg:col-span-2 flex justify-center">
          <div className="relative">
            <GameBoard
              board={board}
              ships={ships}
              showShips={true}
              isInteractive={!allShipsPlaced}
              onCellClick={handleCellClick}
              title="Your Fleet"
            />
            
            {/* Hover preview */}
            {hoveredCells.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="relative bg-white p-4 rounded-lg" style={{marginTop: '52px', marginLeft: '52px'}}>
                  {hoveredCells.map((cell, index) => (
                    <div
                      key={index}
                      className="absolute w-8 h-8 bg-green-300 border-2 border-green-500 opacity-70 rounded"
                      style={{
                        left: `${cell.col * 32}px`,
                        top: `${cell.row * 32}px`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="bg-white p-4 rounded-lg shadow-sm max-w-2xl mx-auto">
          <h3 className="font-semibold text-gray-800 mb-2">Placement Rules:</h3>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            <li>• Ships cannot touch each other (not even diagonally)</li>
            <li>• Ships must be placed within the 10x10 grid</li>
            <li>• You need to place: 1 Carrier (5), 1 Battleship (4), 1 Cruiser (3), 1 Submarine (3), 1 Destroyer (2)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ShipPlacement