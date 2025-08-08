import { useState } from 'react'

const GameBoard = ({ 
  board = Array(10).fill().map(() => Array(10).fill(0)), 
  ships = [], 
  onCellClick = null, 
  showShips = false,
  isInteractive = false,
  title = "Board",
  className = ""
}) => {
  const [hoveredCell, setHoveredCell] = useState(null)

  const getCellContent = (row, col) => {
    const cellValue = board[row][col]
    const hasShip = ships.some(ship => 
      ship.positions.some(pos => pos.row === row && pos.col === col)
    )
    
    if (cellValue === 2) { // Hit
      return hasShip ? '💥' : '💦'
    } else if (cellValue === 1) { // Miss  
      return '🌊'
    } else if (showShips && hasShip) { // Show ship
      return '🚢'
    }
    return ''
  }

  const getCellClass = (row, col) => {
    const cellValue = board[row][col]
    const hasShip = ships.some(ship => 
      ship.positions.some(pos => pos.row === row && pos.col === col)
    )
    
    let baseClass = "w-8 h-8 border border-gray-400 flex items-center justify-center text-xs font-bold transition-colors duration-200"
    
    if (cellValue === 2) { // Hit
      baseClass += hasShip ? " bg-red-500 text-white" : " bg-blue-300"
    } else if (cellValue === 1) { // Miss
      baseClass += " bg-blue-200"
    } else if (showShips && hasShip) { // Show ship
      baseClass += " bg-gray-600 text-white"
    } else { // Empty
      baseClass += " bg-blue-50 hover:bg-blue-100"
      if (isInteractive) {
        baseClass += " cursor-pointer"
      }
    }

    if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col && isInteractive) {
      baseClass += " ring-2 ring-blue-400"
    }

    return baseClass
  }

  const handleCellClick = (row, col) => {
    if (isInteractive && onCellClick && board[row][col] === 0) {
      onCellClick(row, col)
    }
  }

  const handleCellHover = (row, col) => {
    if (isInteractive) {
      setHoveredCell({ row, col })
    }
  }

  const handleCellLeave = () => {
    if (isInteractive) {
      setHoveredCell(null)
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-700">{title}</h3>
      <div className="inline-block bg-white p-4 rounded-lg shadow-md">
        {/* Column headers */}
        <div className="flex mb-2">
          <div className="w-8 h-8"></div> {/* Empty corner */}
          {Array.from({length: 10}, (_, i) => (
            <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-600">
              {i + 1}
            </div>
          ))}
        </div>
        
        {/* Rows with row headers */}
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {/* Row header */}
            <div className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-600">
              {String.fromCharCode(65 + rowIndex)}
            </div>
            {/* Row cells */}
            {row.map((_, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                onMouseLeave={handleCellLeave}
                title={isInteractive ? `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}` : ''}
              >
                {getCellContent(rowIndex, colIndex)}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <div className="flex items-center space-x-4">
          <span>🌊 Miss</span>
          <span>💦 Hit (water)</span>
          <span>💥 Hit (ship)</span>
          {showShips && <span>🚢 Ship</span>}
        </div>
      </div>
    </div>
  )
}

export default GameBoard