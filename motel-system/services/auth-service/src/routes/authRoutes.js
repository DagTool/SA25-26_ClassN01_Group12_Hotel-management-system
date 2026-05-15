const express = require('express')
const router = express.Router()
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  getBranchSettings,
  refreshInviteCode
} = require('../controllers/authController')

// POST /api/auth/register
router.post('/register', register)

// POST /api/auth/login
router.post('/login', login)

// POST /api/auth/refresh
router.post('/refresh', refreshToken)

// POST /api/auth/logout
router.post('/logout', logout)

// GET /api/auth/me
router.get('/me', getMe)

// GET /api/auth/branch
router.get('/branch', getBranchSettings)

// POST /api/auth/branch/refresh-invite
router.post('/branch/refresh-invite', refreshInviteCode)

module.exports = router