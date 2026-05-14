const express = require('express')
const router = express.Router()
const {
  getRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom
} = require('../controllers/roomController')

// --- Rooms ---
router.get('/', getRooms)
router.post('/', createRoom)
router.put('/:id', updateRoom)
router.patch('/:id/status', updateRoomStatus)
router.delete('/:id', deleteRoom)

module.exports = router
