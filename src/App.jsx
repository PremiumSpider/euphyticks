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
  const [showEditLedger, setShowEditLedger] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [queuedPopups, setQueuedPopups] = useState([])
  const [currentQueuedPopup, setCurrentQueuedPopup] = useState(null)
  
  // Add record form state
  const [newRecord, setNewRecord] = useState({
    name: '',
    number: '',
    position: 'M' // L, M, R
  })

  // Ledger settings
  const [ledgerSettings, setLedgerSettings] = useState({
    flashFrequency: 10, // seconds between flashes
    flashDuration: 5,   // seconds to show flash
    flashingEnabled: true // whether flashing is enabled
  })

  // Ledger flashing state
  const [isLedgerFlashing, setIsLedgerFlashing] = useState(false)

  // Ledger flashing effect
  useEffect(() => {
    if (!ledgerEnabled || ledgerRecords.length === 0 || !ledgerSettings.flashingEnabled) {
      setIsLedgerFlashing(false)
      return
    }

    let flashInterval
    let currentTimeout

    const startFlashing = () => {
      // Start flashing immediately
      setIsLedgerFlashing(true)
      
      // Stop flashing after duration
      currentTimeout = setTimeout(() => {
        setIsLedgerFlashing(false)
      }, ledgerSettings.flashDuration * 1000)
      
      // Set up recurring flashes
      flashInterval = setInterval(() => {
        setIsLedgerFlashing(true)
        currentTimeout = setTimeout(() => {
          setIsLedgerFlashing(false)
        }, ledgerSettings.flashDuration * 1000)
      }, ledgerSettings.flashFrequency * 1000)
    }

    startFlashing()

    // Cleanup function
    return () => {
      if (currentTimeout) clearTimeout(currentTimeout)
      if (flashInterval) clearInterval(flashInterval)
      setIsLedgerFlashing(false)
    }
  }, [ledgerEnabled, ledgerRecords.length, ledgerSettings.flashFrequency, ledgerSettings.flashDuration, ledgerSettings.flashingEnabled])

  // Get last 5 unique names for preset buttons
  const getLastFiveNames = () => {
    const uniqueNames = [...new Set(ledgerRecords.map(record => record.name))]
    return uniqueNames.slice(-5)
  }

  // Format relative time
  const getRelativeTime = (timestamp) => {
    const now = Date.now()
    const diffMs = now - timestamp
    
    // Handle invalid timestamps
    if (!timestamp || isNaN(timestamp) || diffMs < 0) {
      return 'just now'
    }
    
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
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
      timestamp: Date.now(),
      status: null // Will be set to 'hit' or 'miss' later
    }

    // Add to queued popups for bottom right notification with question format
    const queuedItem = {
      id: Date.now(),
      record: record,
      status: 'question' // Special status for question mode
    }
    
    setQueuedPopups(prev => [...prev, queuedItem])
    setShowAddRecord(false)

    // Reset form
    setNewRecord({ name: '', number: '', position: 'M' })
  }

  // Handle hit/miss confirmation through popup dismissal
  const handleHitMissConfirm = (status, record) => {
    const finalRecord = {
      ...record,
      status: status
    }

    setLedgerRecords(prev => {
      const updated = [finalRecord, ...prev]
      return updated.slice(0, 10) // Keep only last 10 records
    })

    // Add confirmation notification to queue
    const confirmationItem = {
      id: Date.now() + 1, // Ensure unique ID
      record: finalRecord,
      status: status
    }
    
    setQueuedPopups(prev => [...prev, confirmationItem])
  }

  // Handle queued popup display
  useEffect(() => {
    if (queuedPopups.length > 0 && !currentQueuedPopup) {
      const nextPopup = queuedPopups[0]
      setCurrentQueuedPopup(nextPopup)
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setCurrentQueuedPopup(null)
        setQueuedPopups(prev => prev.slice(1))
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [queuedPopups, currentQueuedPopup])

  // Handle manual dismiss of queued popup
  const handleDismissQueuedPopup = (isHit = null) => {
    if (currentQueuedPopup && currentQueuedPopup.status === 'question') {
      // If it's a question popup and user provided hit/miss choice
      if (isHit !== null) {
        const status = isHit ? 'hit' : 'miss'
        handleHitMissConfirm(status, currentQueuedPopup.record)
      }
    }
    
    setCurrentQueuedPopup(null)
    setQueuedPopups(prev => prev.slice(1))
  }

  // Handle edit ledger record
  const handleEditRecord = (record) => {
    setEditingRecord({ ...record })
    setShowEditLedger(true)
  }

  // Handle save edited record
  const handleSaveEditedRecord = () => {
    if (!editingRecord) return

    setLedgerRecords(prev => 
      prev.map(record => 
        record.id === editingRecord.id ? editingRecord : record
      )
    )

    setEditingRecord(null)
    setShowEditLedger(false)
  }

  // Handle delete record
  const handleDeleteRecord = (recordId) => {
    setLedgerRecords(prev => prev.filter(record => record.id !== recordId))
    setEditingRecord(null)
    setShowEditLedger(false)
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


      {/* Edit Ledger Popup */}
      <AnimatePresence>
        {showEditLedger && editingRecord && (
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
                <h3 className="text-white font-bold text-lg">Edit Record</h3>
                <button
                  onClick={() => setShowEditLedger(false)}
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
                  value={editingRecord.name}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Number Input */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Number</label>
                <input
                  type="text"
                  value={editingRecord.number}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Position Buttons */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Position</label>
                <div className="flex gap-2">
                  {['L', 'M', 'R'].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setEditingRecord(prev => ({ ...prev, position: pos }))}
                      className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                        editingRecord.position === pos
                          ? 'bg-blue-500/50 text-blue-200 border border-blue-400'
                          : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Buttons */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRecord(prev => ({ ...prev, status: 'hit' }))}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      editingRecord.status === 'hit'
                        ? 'bg-green-500/50 text-green-200 border border-green-400'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-lg">✓</span>
                    Hit
                  </button>
                  <button
                    onClick={() => setEditingRecord(prev => ({ ...prev, status: 'miss' }))}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      editingRecord.status === 'miss'
                        ? 'bg-red-500/50 text-red-200 border border-red-400'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-lg">✕</span>
                    Miss
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveEditedRecord}
                  disabled={!editingRecord.name.trim() || !editingRecord.number.trim()}
                  className="flex-1 py-2 bg-blue-500/30 text-blue-200 border border-blue-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => handleDeleteRecord(editingRecord.id)}
                  className="px-4 py-2 bg-red-500/30 text-red-200 border border-red-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-red-500/40 transition-all"
                >
                  Delete
                </button>
              </div>
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

              {/* Add Record Button */}
              {ledgerEnabled && (
                <button
                  onClick={() => setShowAddRecord(!showAddRecord)}
                  className="px-4 py-2 bg-blue-500/30 text-blue-300 border border-blue-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-blue-500/40 transition-all"
                >
                  Add Record
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
                  
                  {/* Flashing Toggle */}
                  <div className="mb-4">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                      <input
                        type="checkbox"
                        checked={ledgerSettings.flashingEnabled}
                        onChange={(e) => setLedgerSettings(prev => ({ ...prev, flashingEnabled: e.target.checked }))}
                        className="w-5 h-5 rounded border-2 border-blue-400 bg-blue-500/30 checked:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-0"
                      />
                      <span className="text-white font-medium">Enable Flashing</span>
                    </label>
                  </div>

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
                      disabled={!ledgerSettings.flashingEnabled}
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
                      disabled={!ledgerSettings.flashingEnabled}
                    />
                  </div>
                </div>

                {/* Edit Ledger Button */}
                {ledgerEnabled && ledgerRecords.length > 0 && (
                  <button
                    onClick={() => setShowEditLedger(true)}
                    className="w-full py-2 mb-4 bg-purple-500/30 text-purple-200 border border-purple-400/50 rounded-lg backdrop-blur-sm hover:bg-purple-500/40 transition-all"
                  >
                    Edit Ledger
                  </button>
                )}

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

          {/* Queued Notification Popup - Bottom Right */}
          <AnimatePresence>
            {currentQueuedPopup && (
              <motion.div
                initial={{ opacity: 0, x: 300, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 300, y: 20 }}
                className="fixed bottom-6 right-6 z-50"
              >
                {currentQueuedPopup.status === 'question' ? (
                  /* Question Mode - Hit/Miss Selection */
                  <motion.div
                    className="backdrop-blur-md rounded-xl p-4 border bg-blue-500/20 border-blue-400/50 w-72"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-blue-200 flex items-center gap-2">
                        <span>
                          {currentQueuedPopup.record.name} {currentQueuedPopup.record.position}{currentQueuedPopup.record.number} ?
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissQueuedPopup()
                        }}
                        className="text-white/70 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="text-sm text-blue-300 mb-3">
                      Was this a hit or miss?
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissQueuedPopup(true)
                        }}
                        className="flex-1 py-2 bg-green-500/30 text-green-200 border border-green-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-green-500/40 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="text-lg">✓</span>
                        Hit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissQueuedPopup(false)
                        }}
                        className="flex-1 py-2 bg-red-500/30 text-red-200 border border-red-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-red-500/40 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="text-lg">✕</span>
                        Miss
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Confirmation Mode - Show Result */
                  <motion.div
                    className={`backdrop-blur-md rounded-xl p-4 border w-64 ${
                      currentQueuedPopup.status === 'hit'
                        ? 'bg-green-500/20 border-green-400/50'
                        : 'bg-red-500/20 border-red-400/50'
                    }`}
                    onClick={handleDismissQueuedPopup}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`font-semibold flex items-center gap-2 ${
                        currentQueuedPopup.status === 'hit' ? 'text-green-200' : 'text-red-200'
                      }`}>
                        <span>
                          {currentQueuedPopup.record.name} {currentQueuedPopup.record.position}{currentQueuedPopup.record.number}
                        </span>
                        <span className="text-xl">
                          {currentQueuedPopup.status === 'hit' ? '✓' : '✕'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissQueuedPopup()
                        }}
                        className="text-white/70 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className={`text-sm capitalize ${
                      currentQueuedPopup.status === 'hit' ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {currentQueuedPopup.status === 'hit' ? 'Hit' : 'Miss'}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      Click to dismiss
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ledger Display - Bottom Left (Full Screen Mode) */}
          <AnimatePresence>
            {ledgerEnabled && ledgerRecords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: ledgerSettings.flashingEnabled && !isLedgerFlashing ? 0 : 1, 
                  y: 0,
                  scale: isLedgerFlashing ? 1.05 : 1,
                  boxShadow: isLedgerFlashing ? '0 0 30px rgba(59, 130, 246, 0.8)' : '0 0 0px rgba(59, 130, 246, 0)'
                }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ 
                  duration: 0.3,
                  scale: { duration: 0.2 },
                  boxShadow: { duration: 0.2 },
                  opacity: { duration: 0.5 }
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
                        className="p-3 border-b border-white/10 last:border-b-0 transition-all duration-300 cursor-pointer hover:bg-white/5"
                        onClick={() => handleEditRecord(record)}
                      >
                        <div className={`font-semibold transition-all duration-300 flex items-center gap-2 ${
                          isLedgerFlashing ? 'text-blue-100' : 'text-white'
                        }`}>
                          <span>{record.name} {record.position}{record.number}</span>
                          {record.status && (
                            <span className={`text-lg ${
                              record.status === 'hit' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {record.status === 'hit' ? '✓' : '✕'}
                            </span>
                          )}
                        </div>
                        <div className={`text-sm transition-all duration-300 ${
                          isLedgerFlashing ? 'text-blue-200' : 'text-white/50'
                        }`}>
                          {getRelativeTime(record.timestamp)}
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
