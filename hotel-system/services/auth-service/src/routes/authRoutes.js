const express = require('express')
const router = express.Router()
const {
  register,
  login,
  switchHotel,
  createHotel,
  getMyHotels,
  refreshToken,
  logout,
  getMe,
  getBranchSettings,
  refreshInviteCode,
  deleteHotel
} = require('../controllers/authController')

// Auth cơ bản
router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refreshToken)
router.post('/logout', logout)
router.get('/me', getMe)

// Multi-hotel: Admin quản lý nhiều hotel
router.get('/hotels', getMyHotels)           // Lấy danh sách hotels của admin
router.post('/hotels', createHotel)          // Tạo hotel mới
router.post('/switch-hotel', switchHotel)    // Chuyển sang hotel khác

// DELETE: Xóa khách sạn
router.delete('/hotels/:id', deleteHotel);


// Chi nhánh
router.get('/branch', getBranchSettings)
router.post('/branch/refresh-invite', refreshInviteCode)

module.exports = router
