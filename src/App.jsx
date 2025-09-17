import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import './App.css'

function App() {
  // Image and marking state
  const [uploadedImage, setUploadedImage] = useState(null)
  const [marks, setMarks] = useState([])
  const [markSize, setMarkSize] = useState(4) // Size in rem units like original
  const imageRef = useRef(null)

  // Ledger state
  const [ledgerEnabled, setLedgerEnabled] = useState(false)
  const [ledgerRecords, setLedgerRecords] = useState([])
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)
  
  // Add record form state
  const [newRecord, setNewRecord] = useState({
    name: '',
    number: '',
    position: 'M' // L, M, R
  })

  // Ledger settings
  const [ledgerSettings, setLedgerSettings] = useState({
    flashFrequency: 10, // seconds between flashes
    flashDuration: 5    // seconds to show flash
  })

  // Ledger flashing state
  const [isLedgerFlashing, setIsLedgerFlashing] = useState(false)

  // Ledger flashing effect
  useEffect(() => {
    if (!ledgerEnabled || ledgerRecords.length === 0) {
      setIsLedgerFlashing(false)
      return
    }

    const flashCycle = () => {
      // Start flashing
      setIsLedgerFlashing(true)
      
      // Stop flashing after duration
      const stopFlashTimeout = setTimeout(() => {
        setIsLedgerFlashing(false)
      }, ledgerSettings.flashDuration * 1000)

      return stopFlashTimeout
    }

    // Initial flash
    const initialFlashTimeout = flashCycle()

    // Set up recurring flashes
    const flashInterval = setInterval(() => {
      flashCycle()
    }, ledgerSettings.flashFrequency * 1000)

    // Cleanup function
    return () => {
      clearTimeout(initialFlashTimeout)
      clearInterval(flashInterval)
      setIsLedgerFlashing(false)
    }
  }, [ledgerEnabled, ledgerRecords.length, ledgerSettings.flashFrequency, ledgerSettings.flashDuration])

  // Get last 5 unique names for preset buttons
  const getLastFiveNames = () => {
    const uniqueNames = [...new Set(ledgerRecords.map(record => record.name))]
    return uniqueNames.slice(-5)
  }

  // Handle image upload
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target.result)
      setMarks([]) // Clear existing marks when new image is uploaded
    }
    reader.readAsDataURL(file)
  }, [])

  // Handle image click to add mark
  const handleImageClick = (e) => {
    if (!imageRef.current) return
    
    const image = imageRef.current.querySelector('img');
    if (!image) return;
    
    const imageRect = image.getBoundingClientRect();
    const x = (e.clientX - imageRect.left);
    const y = (e.clientY - imageRect.top);
    
    // Adjust the percentage calculation to account for mark size
    const markSizeInPixels = markSize * 16;
    const xPercent = ((x - (markSizeInPixels/2)) / imageRect.width) * 100;
    const yPercent = ((y - (markSizeInPixels/2)) / imageRect.height) * 100;
    
    setMarks([...marks, { 
      id: Date.now(),
      x: xPercent, 
      y: yPercent,
      size: markSize
    }]);
  }

  // Handle adding record to ledger
  const handleAddRecord = () => {
    if (!newRecord.name.trim() || !newRecord.number.trim()) return

    const record = {
      id: Date.now(),
      name: newRecord.name.trim(),
      number: newRecord.number.trim(),
      position: newRecord.position,
      timestamp: new Date().toLocaleTimeString()
    }

    setLedgerRecords(prev => {
      const updated = [record, ...prev]
      return updated.slice(0, 10) // Keep only last 10 records
    })

    // Reset form
    setNewRecord({ name: '', number: '', position: 'M' })
    setShowAddRecord(false)
  }

  // Handle preset name click
  const handlePresetNameClick = (name) => {
    setNewRecord(prev => ({ ...prev, name }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Global Add Record Popup - Only when image is uploaded */}
      <AnimatePresence>
        {showAddRecord && ledgerEnabled && uploadedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              className="bg-black/90 backdrop-blur-md rounded-xl p-6 border border-white/20 w-96 max-w-[90vw]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">Add Record</h3>
                <button
                  onClick={() => setShowAddRecord(false)}
                  className="text-white/70 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={newRecord.name}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                  placeholder="Enter name"
                />
              </div>

              {/* Number Input */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Number</label>
                <input
                  type="text"
                  value={newRecord.number}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                  placeholder="Enter number"
                />
              </div>

              {/* Position Buttons */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Position</label>
                <div className="flex gap-2">
                  {['L', 'M', 'R'].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setNewRecord(prev => ({ ...prev, position: pos }))}
                      className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                        newRecord.position === pos
                          ? 'bg-blue-500/50 text-blue-200 border border-blue-400'
                          : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Name Buttons */}
              {getLastFiveNames().length > 0 && (
                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-2">Recent Names</label>
                  <div className="flex flex-wrap gap-2">
                    {getLastFiveNames().map((name) => (
                      <button
                        key={name}
                        onClick={() => handlePresetNameClick(name)}
                        className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/50 rounded-lg text-sm hover:bg-purple-500/40 transition-all"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Button */}
              <button
                onClick={handleAddRecord}
                disabled={!newRecord.name.trim() || !newRecord.number.trim()}
                className="w-full py-2 bg-green-500/30 text-green-200 border border-green-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Ledger
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploadedImage ? (
        /* Full Screen Image Mode */
        <div className="fixed inset-0 z-10">
          {/* Floating Controls */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
            <button 
              onClick={() => setShowEditPanel(!showEditPanel)}
              className="text-2xl font-bold text-white bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-black/60 transition-all cursor-pointer"
            >
              Image Marker & Ledger
            </button>
            
            <div className="flex gap-4">
              {marks.length > 0 && (
                <button
                  onClick={() => setMarks(prev => prev.slice(0, -1))}
                  className="px-4 py-2 bg-red-500/30 text-red-300 border border-red-400/50 rounded-lg backdrop-blur-sm hover:bg-red-500/40 transition-all"
                >
                  Undo Last
                </button>
              )}

              {/* Ledger Toggle Button */}
              <button
                onClick={() => setLedgerEnabled(!ledgerEnabled)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  ledgerEnabled 
                    ? 'bg-green-500/30 text-green-300 border border-green-400/50' 
                    : 'bg-gray-500/30 text-gray-300 border border-gray-400/50'
                } backdrop-blur-sm hover:bg-opacity-40`}
              >
                Ledger: {ledgerEnabled ? 'ON' : 'OFF'}
              </button>

              {/* Add Record Button */}
              {ledgerEnabled && (
                <button
                  onClick={() => setShowAddRecord(!showAddRecord)}
                  className="px-4 py-2 bg-blue-500/30 text-blue-300 border border-blue-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-blue-500/40 transition-all"
                >
                  Add Record
                </button>
              )}
            </div>
          </div>

          {/* Edit Panel */}
          <AnimatePresence>
            {showEditPanel && (
              <motion.div
                initial={{ opacity: 0, x: -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                className="absolute top-20 left-4 z-30 bg-black/80 backdrop-blur-md rounded-xl p-6 border border-white/20 w-80"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-lg">Edit Settings</h3>
                  <button
                    onClick={() => setShowEditPanel(false)}
                    className="text-white/70 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Mark Size Control */}
                <div className="mb-6">
                  <label className="block text-white/70 text-sm mb-2">Mark Size: {markSize}</label>
                  <input
                    type="range"
                    min="4"
                    max="17"
                    value={markSize}
                    onChange={(e) => setMarkSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Ledger Settings */}
                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">Ledger Settings</h4>
                  
                  {/* Flash Frequency */}
                  <div className="mb-4">
                    <label className="block text-white/70 text-sm mb-2">
                      Flash Frequency: {ledgerSettings.flashFrequency}s
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={ledgerSettings.flashFrequency}
                      onChange={(e) => setLedgerSettings(prev => ({ ...prev, flashFrequency: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Flash Duration */}
                  <div className="mb-4">
                    <label className="block text-white/70 text-sm mb-2">
                      Flash Duration: {ledgerSettings.flashDuration}s
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={ledgerSettings.flashDuration}
                      onChange={(e) => setLedgerSettings(prev => ({ ...prev, flashDuration: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setMarks([]);
                    setShowEditPanel(false);
                  }}
                  className="w-full py-2 bg-red-500/30 text-red-300 border border-red-400/50 rounded-lg backdrop-blur-sm hover:bg-red-500/40 transition-all"
                >
                  Reset Application
                </button>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Full Screen Image */}
          <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={8}
            doubleClick={{ mode: "reset" }}
            wheel={{ step: 0.1 }}
          >
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div 
                className="relative w-full h-full cursor-crosshair" 
                onClick={handleImageClick}
                ref={imageRef}
              >
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-full h-full object-contain"
                />
                
                {/* Render marks */}
                {marks.map((mark) => (
                  <motion.div
                    key={mark.id}
                    className="absolute pointer-events-none"
                    style={{ 
                      left: `${mark.x}%`,
                      top: `${mark.y}%`,
                      width: `${(mark.size || markSize) * 2}rem`,
                      height: `${(mark.size || markSize) * 2}rem`,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    {/* Custom X Mark */}
                    <div className="x-mark w-full h-full relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 transform rotate-45 rounded-sm shadow-lg"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 transform -rotate-45 rounded-sm shadow-lg"></div>
                      <div className="absolute inset-1 bg-gradient-to-br from-red-400 via-orange-400 to-red-500 transform rotate-45 rounded-sm"></div>
                      <div className="absolute inset-1 bg-gradient-to-br from-red-400 via-orange-400 to-red-500 transform -rotate-45 rounded-sm"></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TransformComponent>
          </TransformWrapper>

          {/* Ledger Display - Bottom Left (Full Screen Mode) */}
          <AnimatePresence>
            {ledgerEnabled && ledgerRecords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: isLedgerFlashing ? 1.05 : 1,
                  boxShadow: isLedgerFlashing ? '0 0 30px rgba(59, 130, 246, 0.8)' : '0 0 0px rgba(59, 130, 246, 0)'
                }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ 
                  duration: 0.3,
                  scale: { duration: 0.2 },
                  boxShadow: { duration: 0.2 }
                }}
                className="fixed bottom-6 left-6 max-w-sm z-40"
              >
                <div className={`backdrop-blur-md rounded-xl border overflow-hidden transition-all duration-300 ${
                  isLedgerFlashing 
                    ? 'bg-blue-500/30 border-blue-400/70 shadow-lg shadow-blue-500/50' 
                    : 'bg-black/10 border-white/10'
                }`}>
                  <div className={`p-4 transition-all duration-300 ${
                    isLedgerFlashing ? 'bg-blue-500/40' : 'bg-black/20'
                  }`}>
                    <h3 className="text-white font-bold">Ledger Records</h3>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {ledgerRecords.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0,
                          backgroundColor: isLedgerFlashing ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                        transition={{ 
                          delay: index * 0.1,
                          backgroundColor: { duration: 0.3 }
                        }}
                        className="p-3 border-b border-white/10 last:border-b-0 transition-all duration-300"
                      >
                        <div className={`font-semibold transition-all duration-300 ${
                          isLedgerFlashing ? 'text-blue-100' : 'text-white'
                        }`}>
                          {record.name} {record.position}{record.number}
                        </div>
                        <div className={`text-sm transition-all duration-300 ${
                          isLedgerFlashing ? 'text-blue-200' : 'text-white/50'
                        }`}>
                          {record.timestamp}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Upload Mode */
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Controls */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-white">Image Marker & Ledger</h1>
            </div>

            {/* Main Content Area - Centered Image Upload */}
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  {/* Image Upload */}
                  <div className="relative bg-gray-800/50 rounded-lg min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-600">
                    <label className="cursor-pointer text-center">
                      <div className="text-gray-400 text-xl mb-4">
                        Click to upload an image
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="px-6 py-3 bg-blue-500/30 text-blue-300 border border-blue-400/50 rounded-lg backdrop-blur-sm hover:bg-blue-500/40 transition-all inline-block">
                        Choose Image
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default App
