const express = require('express')
const router = express.Router()
const {
  getRoomClasses,
  createRoomClass,
  getRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom
} = require('../controllers/roomController')

// --- Room Classes ---
router.get('/classes', getRoomClasses)
router.post('/classes', createRoomClass)

// --- Rooms ---
router.get('/', getRooms)
router.post('/', createRoom)
router.put('/:id', updateRoom)
router.patch('/:id/status', updateRoomStatus)
router.delete('/:id', deleteRoom)

module.exports = router
