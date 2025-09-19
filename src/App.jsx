import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import './App.css'

function App() {
  // LocalStorage key for persistence
  const STORAGE_KEY = 'euphy-hitz-gacha-slabs-config'

  // Load initial state from localStorage
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
      return null
    }
  }

  // Save state to localStorage
  const saveToStorage = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  // Clear localStorage
  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  const savedData = loadFromStorage()

  // Image and marking state
  const [uploadedImage, setUploadedImage] = useState(savedData?.uploadedImage || null)
  const [marks, setMarks] = useState(savedData?.marks || [])
  const [markSize, setMarkSize] = useState(savedData?.markSize || 4) // Size in rem units like original
  const imageRef = useRef(null)

  // Ledger state
  const [ledgerEnabled, setLedgerEnabled] = useState(savedData?.ledgerEnabled || false)
  const [ledgerRecords, setLedgerRecords] = useState(savedData?.ledgerRecords || [])
  const [pendingRecords, setPendingRecords] = useState(savedData?.pendingRecords || []) // Records waiting for hit/miss confirmation
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
  const [ledgerSettings, setLedgerSettings] = useState(savedData?.ledgerSettings || {
    flashFrequency: 10, // seconds between flashes
    flashDuration: 5,   // seconds to show flash
    flashingEnabled: true, // whether flashing is enabled
    recordSize: 3 // text size for ledger records (1-9)
  })

  // New state for Chases and Bags
  const [chasesCount, setChasesCount] = useState(savedData?.chasesCount || 12)
  const [bagsCount, setBagsCount] = useState(savedData?.bagsCount || 50)
  const [toggleFlashing, setToggleFlashing] = useState(false)

  // Ledger flashing state
  const [isLedgerFlashing, setIsLedgerFlashing] = useState(false)

  // Button visibility state for auto-hide functionality
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const inactivityTimerRef = useRef(null)

  // Save persistent state to localStorage whenever relevant state changes
  useEffect(() => {
    const dataToSave = {
      uploadedImage,
      marks,
      markSize,
      ledgerEnabled,
      ledgerRecords,
      pendingRecords,
      ledgerSettings,
      chasesCount,
      bagsCount
    }
    saveToStorage(dataToSave)
  }, [uploadedImage, marks, markSize, ledgerEnabled, ledgerRecords, pendingRecords, ledgerSettings, chasesCount, bagsCount])

  // Auto-hide buttons after 3 seconds of inactivity
  const resetInactivityTimer = useCallback(() => {
    setButtonsVisible(true)
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    inactivityTimerRef.current = setTimeout(() => {
      setButtonsVisible(false)
    }, 3000)
  }, [])

  // Set up inactivity timer on mount and mouse movement
  useEffect(() => {
    if (uploadedImage) {
      resetInactivityTimer()
      
      const handleMouseMove = () => {
        resetInactivityTimer()
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('click', handleMouseMove)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('click', handleMouseMove)
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current)
        }
      }
    }
  }, [uploadedImage, resetInactivityTimer])

  // Ledger flashing effect
  useEffect(() => {
    if (!ledgerEnabled || ledgerRecords.length === 0 || !ledgerSettings.flashingEnabled) {
      setIsLedgerFlashing(false)
      setToggleFlashing(false)
      return
    }

    let flashInterval
    let currentTimeout

    const startFlashing = () => {
      // Start flashing immediately
      setIsLedgerFlashing(true)
      setToggleFlashing(true)
      
      // Stop flashing after duration
      currentTimeout = setTimeout(() => {
        setIsLedgerFlashing(false)
        setToggleFlashing(false)
      }, ledgerSettings.flashDuration * 1000)
      
      // Set up recurring flashes
      flashInterval = setInterval(() => {
        setIsLedgerFlashing(true)
        setToggleFlashing(true)
        currentTimeout = setTimeout(() => {
          setIsLedgerFlashing(false)
          setToggleFlashing(false)
        }, ledgerSettings.flashDuration * 1000)
      }, ledgerSettings.flashFrequency * 1000)
    }

    startFlashing()

    // Cleanup function
    return () => {
      if (currentTimeout) clearTimeout(currentTimeout)
      if (flashInterval) clearInterval(flashInterval)
      setIsLedgerFlashing(false)
      setToggleFlashing(false)
    }
  }, [ledgerEnabled, ledgerRecords.length, ledgerSettings.flashFrequency, ledgerSettings.flashDuration, ledgerSettings.flashingEnabled])

  // Get last 5 unique names for preset buttons
  const getLastFiveNames = () => {
    // Combine both pending and confirmed records
    const allRecords = [...pendingRecords, ...ledgerRecords]
    const uniqueNames = [...new Set(allRecords.map(record => record.name))]
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
    
    // Randomly choose orange or red for the border
    const borderColor = Math.random() < 0.5 ? 'orange' : 'red';
    
    setMarks([...marks, { 
      id: Date.now(),
      x: xPercent, 
      y: yPercent,
      size: markSize,
      borderColor: borderColor
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
      status: 'pending' // Pending confirmation
    }

    // Add to pending records (will show in ledger with ?)
    setPendingRecords(prev => [record, ...prev])
    
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

  // Handle adding another record (keeps modal open)
  const handleAddAnotherRecord = () => {
    if (!newRecord.name.trim() || !newRecord.number.trim()) return

    const record = {
      id: Date.now(),
      name: newRecord.name.trim(),
      number: newRecord.number.trim(),
      position: newRecord.position,
      timestamp: Date.now(),
      status: 'pending' // Pending confirmation
    }

    // Add to pending records (will show in ledger with ?)
    setPendingRecords(prev => [record, ...prev])
    
    // Add to queued popups for bottom right notification with question format
    const queuedItem = {
      id: Date.now(),
      record: record,
      status: 'question' // Special status for question mode
    }
    
    setQueuedPopups(prev => [...prev, queuedItem])
    
    // Keep modal open, just reset form
    setNewRecord({ name: '', number: '', position: 'M' })
  }

  // Handle hit/miss confirmation through popup dismissal
  const handleHitMissConfirm = (status, record) => {
    const finalRecord = {
      ...record,
      status: status
    }

    // Remove from pending records
    setPendingRecords(prev => prev.filter(r => r.id !== record.id))

    // Add to confirmed ledger records
    setLedgerRecords(prev => {
      const updated = [finalRecord, ...prev]
      return updated.slice(0, 10) // Keep only last 10 records
    })

    // No longer add confirmation notification to queue - user requested removal
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
              
              {/* Show Previous Entries */}
              {pendingRecords.length > 0 && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-white/70 text-sm mb-2">Previous Entries:</div>
                        <div className="space-y-1">
                          {pendingRecords.slice(0, 3).map((record, index) => (
                            <div key={record.id} className="text-sm text-white/60 flex items-center gap-2">
                              <span className="text-yellow-400">?</span>
                              <span>{record.name} {record.position === 'L' ? 'Left' : record.position === 'M' ? 'Middle' : 'Right'}{record.number}</span>
                              <span className="text-white/40">• {getRelativeTime(record.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                </div>
              )}
              
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

              {/* Add Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={!newRecord.name.trim() || !newRecord.number.trim() ? () => setShowAddRecord(false) : handleAddRecord}
                  className="flex-1 py-2 bg-green-500/30 text-green-200 border border-green-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-green-500/40 transition-all"
                >
                  {!newRecord.name.trim() || !newRecord.number.trim() ? 'Close' : 'Add to Ledger'}
                </button>
                <button
                  onClick={handleAddAnotherRecord}
                  disabled={!newRecord.name.trim() || !newRecord.number.trim()}
                  className="flex-1 py-2 bg-blue-500/30 text-blue-200 border border-blue-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Another
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Edit Ledger Popup */}
      <AnimatePresence>
        {showEditLedger && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              className="bg-black/90 backdrop-blur-md rounded-xl p-6 border border-white/20 w-[600px] max-w-[90vw] max-h-[80vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">Edit Ledger</h3>
                <button
                  onClick={() => {
                    setShowEditLedger(false)
                    setEditingRecord(null)
                  }}
                  className="text-white/70 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="mb-4 flex gap-3">
                <button
                  onClick={() => {
                    if (ledgerRecords.length > 0) {
                      setLedgerRecords(prev => prev.slice(1))
                    }
                  }}
                  disabled={ledgerRecords.length === 0}
                  className="px-4 py-2 bg-red-500/30 text-red-200 border border-red-400/50 rounded-lg font-semibold backdrop-blur-sm hover:bg-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Quick Erase Last Entry
                </button>
                <div className="text-white/70 text-sm flex items-center">
                  {ledgerRecords.length} confirmed entries
                </div>
              </div>

              {/* All Entries List */}
              <div className="max-h-96 overflow-y-auto">
                {ledgerRecords.length === 0 ? (
                  <div className="text-white/50 text-center py-8">
                    No confirmed entries to edit
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ledgerRecords.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-lg border transition-all ${
                          editingRecord && editingRecord.id === record.id
                            ? 'bg-blue-500/20 border-blue-400/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {editingRecord && editingRecord.id === record.id ? (
                          /* Edit Mode */
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              {/* Name Input */}
                              <div className="flex-1">
                                <label className="block text-white/70 text-xs mb-1">Name</label>
                                <input
                                  type="text"
                                  value={editingRecord.name}
                                  onChange={(e) => setEditingRecord(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 text-sm"
                                />
                              </div>
                              
                              {/* Number Input */}
                              <div className="w-20">
                                <label className="block text-white/70 text-xs mb-1">Number</label>
                                <input
                                  type="text"
                                  value={editingRecord.number}
                                  onChange={(e) => setEditingRecord(prev => ({ ...prev, number: e.target.value }))}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 text-sm"
                                />
                              </div>
                            </div>

                            {/* Position Buttons */}
                            <div>
                              <label className="block text-white/70 text-xs mb-1">Position</label>
                              <div className="flex gap-2">
                                {['L', 'M', 'R'].map((pos) => (
                                  <button
                                    key={pos}
                                    onClick={() => setEditingRecord(prev => ({ ...prev, position: pos }))}
                                    className={`px-4 py-1 rounded text-sm font-semibold transition-all ${
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
                            <div>
                              <label className="block text-white/70 text-xs mb-1">Status</label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingRecord(prev => ({ ...prev, status: 'hit' }))}
                                  className={`px-4 py-1 rounded text-sm font-semibold transition-all flex items-center gap-1 ${
                                    editingRecord.status === 'hit'
                                      ? 'bg-green-500/50 text-green-200 border border-green-400'
                                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                                  }`}
                                >
                                  <span>✓</span>
                                  Hit
                                </button>
                                <button
                                  onClick={() => setEditingRecord(prev => ({ ...prev, status: 'miss' }))}
                                  className={`px-4 py-1 rounded text-sm font-semibold transition-all flex items-center gap-1 ${
                                    editingRecord.status === 'miss'
                                      ? 'bg-red-500/50 text-red-200 border border-red-400'
                                      : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                                  }`}
                                >
                                  <span>✕</span>
                                  Miss
                                </button>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={handleSaveEditedRecord}
                                disabled={!editingRecord.name.trim() || !editingRecord.number.trim()}
                                className="px-4 py-2 bg-green-500/30 text-green-200 border border-green-400/50 rounded-lg text-sm font-semibold backdrop-blur-sm hover:bg-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRecord(null)}
                                className="px-4 py-2 bg-gray-500/30 text-gray-200 border border-gray-400/50 rounded-lg text-sm font-semibold backdrop-blur-sm hover:bg-gray-500/40 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(editingRecord.id)}
                                className="px-4 py-2 bg-red-500/30 text-red-200 border border-red-400/50 rounded-lg text-sm font-semibold backdrop-blur-sm hover:bg-red-500/40 transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{record.name} {record.position === 'L' ? 'Left' : record.position === 'M' ? 'Middle' : 'Right'}{record.number}</span>
                                <span className={`text-lg ${
                                  record.status === 'hit' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {record.status === 'hit' ? '✓' : '✕'}
                                </span>
                              </div>
                              <div className="text-sm text-white/50">
                                {getRelativeTime(record.timestamp)}
                              </div>
                            </div>
                            <button
                              onClick={() => setEditingRecord({ ...record })}
                              className="px-3 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/50 rounded text-sm hover:bg-blue-500/40 transition-all"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
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
              className="text-2xl font-bold text-white bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-black/60 transition-all cursor-pointer animate-pulse"
              style={{
                animation: 'subtle-blink 3s ease-in-out infinite'
              }}
            >
              Euphy Hitz Gacha Slabs
            </button>
            
            <AnimatePresence>
              {buttonsVisible && (
                <motion.div 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {marks.length > 0 && (
                    <button
                      onClick={() => setMarks(prev => prev.slice(0, -1))}
                      className="px-4 py-2 bg-red-500/30 text-red-300 border border-red-400/50 rounded-lg backdrop-blur-sm hover:bg-red-500/40 transition-all font-bold"
                    >
                      Undo Last
                    </button>
                  )}

                  {/* Add Record Button */}
                  {ledgerEnabled && (
                    <button
                      onClick={() => setShowAddRecord(!showAddRecord)}
                      className="px-4 py-2 bg-blue-500/30 text-blue-300 border border-blue-400/50 rounded-lg font-bold backdrop-blur-sm hover:bg-blue-500/40 transition-all"
                    >
                      Add Record
                    </button>
                  )}

                  {/* Flash Shortcut Button - Only when Ledger is ON */}
                  {ledgerEnabled && (
                    <button
                      onClick={() => setLedgerSettings(prev => ({ ...prev, flashingEnabled: !prev.flashingEnabled }))}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        ledgerSettings.flashingEnabled 
                          ? 'bg-green-500/30 text-green-300 border border-green-400/50' 
                          : 'bg-white/20 text-white border border-white/40'
                      } backdrop-blur-sm hover:bg-opacity-40`}
                    >
                      Flash: {ledgerSettings.flashingEnabled ? 'ON' : 'OFF'}
                    </button>
                  )}

                  {/* Ledger Toggle Button */}
                  <button
                    onClick={() => setLedgerEnabled(!ledgerEnabled)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      ledgerEnabled 
                        ? 'bg-green-500/30 text-green-300 border border-green-400/50' 
                        : 'bg-white/20 text-white border border-white/40'
                    } backdrop-blur-sm hover:bg-opacity-40`}
                  >
                    Ledger: {ledgerEnabled ? 'ON' : 'OFF'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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
                    min="1"
                    max="17"
                    value={markSize}
                    onChange={(e) => setMarkSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Chases and Bags Controls */}
                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">Chases & Bags</h4>
                  
                  {/* Chases Control */}
                  <div className="mb-4">
                    <label className="block text-white/70 text-sm mb-2">
                      Chases: {chasesCount}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setChasesCount(prev => Math.max(0, prev - 1))}
                        disabled={chasesCount <= 0}
                        className="px-3 py-1 bg-red-500/30 text-red-200 border border-red-400/50 rounded font-semibold hover:bg-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -C
                      </button>
                      <div className="flex-1 text-center text-white font-mono">
                        {chasesCount}
                      </div>
                      <button
                        onClick={() => setChasesCount(prev => prev + 1)}
                        className="px-3 py-1 bg-green-500/30 text-green-200 border border-green-400/50 rounded font-semibold hover:bg-green-500/40 transition-all"
                      >
                        +C
                      </button>
                    </div>
                  </div>

                  {/* Bags Control */}
                  <div className="mb-4">
                    <label className="block text-white/70 text-sm mb-2">
                      Bags: {bagsCount}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBagsCount(prev => Math.max(0, prev - 1))}
                        disabled={bagsCount <= 0}
                        className="px-3 py-1 bg-red-500/30 text-red-200 border border-red-400/50 rounded font-semibold hover:bg-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -B
                      </button>
                      <div className="flex-1 text-center text-white font-mono">
                        {bagsCount}
                      </div>
                      <button
                        onClick={() => setBagsCount(prev => prev + 1)}
                        className="px-3 py-1 bg-green-500/30 text-green-200 border border-green-400/50 rounded font-semibold hover:bg-green-500/40 transition-all"
                      >
                        +B
                      </button>
                    </div>
                  </div>

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

                  {/* Record Size Control */}
                  <div className="mb-4">
                    <label className="block text-white/70 text-sm mb-2">
                      Record Size: {ledgerSettings.recordSize}
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setLedgerSettings(prev => ({ 
                          ...prev, 
                          recordSize: Math.max(1, prev.recordSize - 1) 
                        }))}
                        disabled={ledgerSettings.recordSize <= 1}
                        className="px-3 py-1 bg-red-500/30 text-red-200 border border-red-400/50 rounded font-semibold hover:bg-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -R
                      </button>
                      <div className="flex-1 text-center text-white font-mono">
                        {ledgerSettings.recordSize}
                      </div>
                      <button
                        onClick={() => setLedgerSettings(prev => ({ 
                          ...prev, 
                          recordSize: Math.min(9, prev.recordSize + 1) 
                        }))}
                        disabled={ledgerSettings.recordSize >= 9}
                        className="px-3 py-1 bg-green-500/30 text-green-200 border border-green-400/50 rounded font-semibold hover:bg-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +R
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Ledger Button */}
                {ledgerEnabled && (
                  <button
                    onClick={() => setShowEditLedger(true)}
                    className="w-full py-2 mb-4 bg-purple-500/30 text-purple-200 border border-purple-400/50 rounded-lg backdrop-blur-sm hover:bg-purple-500/40 transition-all"
                  >
                    Edit Ledger
                  </button>
                )}

                {/* Update/Replace Image Button */}
                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-2">Update Image</label>
                  <label className="w-full py-2 bg-blue-500/30 text-blue-200 border border-blue-400/50 rounded-lg backdrop-blur-sm hover:bg-blue-500/40 transition-all cursor-pointer flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Replace Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-white/50 text-xs mt-1">
                    Select a new image to replace the current one. All marks will be cleared.
                  </p>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    // Clear all state
                    setUploadedImage(null);
                    setMarks([]);
                    setLedgerRecords([]);
                    setPendingRecords([]);
                    setQueuedPopups([]);
                    setCurrentQueuedPopup(null);
                    setLedgerEnabled(false);
                    setShowEditPanel(false);
                    // Reset ledger settings to defaults
                    setLedgerSettings({
                      flashFrequency: 10,
                      flashDuration: 5,
                      flashingEnabled: true,
                      recordSize: 3
                    });
                    // Reset mark size to default
                    setMarkSize(4);
                    // Reset chases and bags to defaults
                    setChasesCount(12);
                    setBagsCount(50);
                    setToggleFlashing(false);
                    // Clear localStorage
                    clearStorage();
                  }}
                  className="w-full py-2 bg-red-500/30 text-red-300 border border-red-400/50 rounded-lg backdrop-blur-sm hover:bg-red-500/40 transition-all"
                >
                  Reset Application
                </button>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Yellow Bar in Center Middle - Only show when toggle is flashing */}
          <AnimatePresence>
            {uploadedImage && toggleFlashing && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ 
                  opacity: isLedgerFlashing ? 1 : 0.3,
                  y: 0,
                  scale: isLedgerFlashing ? 1.1 : 1,
                  boxShadow: isLedgerFlashing ? '0 0 30px rgba(234, 179, 8, 0.8)' : '0 0 0px rgba(234, 179, 8, 0)'
                }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  duration: 0.3,
                  scale: { duration: 0.2 },
                  boxShadow: { duration: 0.2 },
                  opacity: { duration: 0.5 }
                }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
              >
                <div className={`backdrop-blur-sm rounded-lg px-8 py-4 border shadow-lg transition-all duration-300 ${
                  isLedgerFlashing 
                    ? 'bg-yellow-500/90 border-yellow-400/70 shadow-yellow-500/50' 
                    : 'bg-yellow-500/60 border-yellow-400/50'
                }`}>
                  <div className="text-black font-bold text-4xl">
                    {chasesCount} Chases / {bagsCount} Bagz
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transparent Circle Shortcut Buttons - Bottom Right */}
          <AnimatePresence>
            {uploadedImage && buttonsVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute bottom-6 right-6 z-30 flex gap-3"
              >
                {/* -1C Button */}
                <button
                  onClick={() => setChasesCount(prev => Math.max(0, prev - 1))}
                  disabled={chasesCount <= 0}
                  className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white font-bold text-lg hover:bg-black/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  -1C
                </button>
                
                {/* -1B Button */}
                <button
                  onClick={() => setBagsCount(prev => Math.max(0, prev - 1))}
                  disabled={bagsCount <= 0}
                  className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white font-bold text-lg hover:bg-black/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  -1B
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
                    {/* Euphy X Mark - Clipped to X Shape with Black Border */}
                    <div className="euphy-x-mark w-full h-full relative">
                      {/* Multiple colored border layers for thick outline */}
                      {[
                        { x: -3, y: 0 }, { x: 3, y: 0 }, { x: 0, y: -3 }, { x: 0, y: 3 },
                        { x: -2, y: -2 }, { x: 2, y: -2 }, { x: -2, y: 2 }, { x: 2, y: 2 },
                        { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }
                      ].map((offset, index) => (
                        <img
                          key={index}
                          src="/euphy.png"
                          alt="Euphy marker border"
                          className="absolute inset-0 w-full h-full object-contain"
                          style={{ 
                            clipPath: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)',
                            filter: `brightness(0) saturate(0)`,
                            backgroundColor: mark.borderColor || 'black',
                            mixBlendMode: 'multiply',
                            transform: `translate(${offset.x}px, ${offset.y}px)`,
                            zIndex: 1
                          }}
                        />
                      ))}
                      {/* Main euphy image */}
                      <img
                        src="/euphy.png"
                        alt="Euphy marker"
                        className="absolute inset-0 w-full h-full object-contain drop-shadow-lg"
                        style={{ 
                          filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))',
                          clipPath: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)',
                          zIndex: 10,
                          position: 'relative'
                        }}
                      />
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
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>
                          {currentQueuedPopup.record.name} {currentQueuedPopup.record.position === 'L' ? 'Left' : currentQueuedPopup.record.position === 'M' ? 'Middle' : 'Right'}{currentQueuedPopup.record.number} ?
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
                    
                    <div className="text-sm text-white mb-3">
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
                          {currentQueuedPopup.record.name} {currentQueuedPopup.record.position === 'L' ? 'Left' : currentQueuedPopup.record.position === 'M' ? 'Middle' : 'Right'}{currentQueuedPopup.record.number}
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
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ledger Display - Bottom Left (Full Screen Mode) */}
          <AnimatePresence>
            {ledgerEnabled && (pendingRecords.length > 0 || ledgerRecords.length > 0) && (
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
                className="fixed bottom-6 left-6 z-40"
                style={{ 
                  maxWidth: `${12 + (ledgerSettings.recordSize * 4)}rem`,
                  minWidth: `${16 + (ledgerSettings.recordSize * 2)}rem`
                }}
              >
                <div className={`backdrop-blur-md rounded-xl border overflow-hidden transition-all duration-300 ${
                  ledgerSettings.flashingEnabled
                    ? (isLedgerFlashing 
                        ? 'bg-blue-500/30 border-blue-400/70 shadow-lg shadow-blue-500/50' 
                        : 'bg-blue-500/20 border-blue-400/50')
                    : 'bg-black/10 border-white/10'
                }`}>
                  <div className={`p-4 transition-all duration-300 ${
                    ledgerSettings.flashingEnabled
                      ? (isLedgerFlashing ? 'bg-blue-500/40' : 'bg-blue-500/30')
                      : 'bg-black/20'
                  }`}>
                    <h3 className="text-white font-bold"></h3>
                  </div>
                  
                  <div 
                    className="overflow-y-auto"
                    style={{ 
                      maxHeight: `${20 + (ledgerSettings.recordSize * 4)}rem`
                    }}
                  >
                    {/* Pending Records (with ?) */}
                    {pendingRecords.map((record, index) => (
                      <motion.div
                        key={`pending-${record.id}`}
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
                        className="p-3 border-b border-white/10 transition-all duration-300 cursor-default"
                      >
                        <div 
                          className={`font-semibold transition-all duration-300 flex items-center gap-2 ${
                            isLedgerFlashing ? 'text-blue-100' : 'text-white'
                          }`}
                          style={{ fontSize: `${0.5 + (ledgerSettings.recordSize * 0.2)}rem` }}
                        >
                          <span>{record.name} {record.position === 'L' ? 'Left' : record.position === 'M' ? 'Middle' : 'Right'}{record.number}</span>
                          <span className="text-yellow-400" style={{ fontSize: `${0.7 + (ledgerSettings.recordSize * 0.2)}rem` }}>?</span>
                        </div>
                        <div 
                          className={`transition-all duration-300 ${
                            isLedgerFlashing ? 'text-blue-200' : 'text-white/50'
                          }`}
                          style={{ fontSize: `${0.4 + (ledgerSettings.recordSize * 0.15)}rem` }}
                        >
                          {getRelativeTime(record.timestamp)} • Pending
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Confirmed Records (with ✓ or ✕) */}
                    {ledgerRecords.map((record, index) => (
                      <motion.div
                        key={`confirmed-${record.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0,
                          backgroundColor: isLedgerFlashing ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                        }}
                        transition={{ 
                          delay: (pendingRecords.length + index) * 0.1,
                          backgroundColor: { duration: 0.3 }
                        }}
                        className="p-3 border-b border-white/10 last:border-b-0 transition-all duration-300 cursor-pointer hover:bg-white/5"
                        onClick={() => {
                          setEditingRecord({ ...record })
                          setShowEditLedger(true)
                        }}
                      >
                        <div 
                          className={`font-semibold transition-all duration-300 flex items-center gap-2 ${
                            isLedgerFlashing ? 'text-blue-100' : 'text-white'
                          }`}
                          style={{ fontSize: `${0.5 + (ledgerSettings.recordSize * 0.2)}rem` }}
                        >
                          <span>{record.name} {record.position === 'L' ? 'Left' : record.position === 'M' ? 'Middle' : 'Right'}{record.number}</span>
                          {record.status && (
                            <span 
                              className={`${
                                record.status === 'hit' ? 'text-green-400' : 'text-red-400'
                              }`}
                              style={{ fontSize: `${0.7 + (ledgerSettings.recordSize * 0.2)}rem` }}
                            >
                              {record.status === 'hit' ? '✓ (Hit)' : '✕ (Miss)'}
                            </span>
                          )}
                        </div>
                        <div 
                          className={`transition-all duration-300 ${
                            isLedgerFlashing ? 'text-blue-200' : 'text-white/50'
                          }`}
                          style={{ fontSize: `${0.4 + (ledgerSettings.recordSize * 0.15)}rem` }}
                        >
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
              <h1 
                className="text-3xl font-bold text-white"
                style={{
                  animation: 'subtle-blink 3s ease-in-out infinite'
                }}
              >
                Euphy Hitz Gacha Slabs
              </h1>
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
