const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { client: redisClient } = require('../redis')
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt')
const jwt = require('jsonwebtoken')
const roomDbPool = require('../roomDb')
const { publishEvent } = require('../rabbitmq')

// ─── Helper: tạo 10 phòng mặc định cho branch mới ──────────────
async function autoCreateRooms(branchId) {
  const roomClient = await roomDbPool.connect()
  try {
    await roomClient.query('BEGIN')
    for (let i = 1; i <= 10; i++) {
      const roomNumber = `1${i.toString().padStart(2, '0')}`
      await roomClient.query(
        `INSERT INTO rooms (branch_id, room_number, floor, type, base_price, hourly_base_price, hourly_extra_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [branchId, roomNumber, 1, 'single', 200000, 60000, 20000]
      )
    }
    await roomClient.query('COMMIT')
  } catch (err) {
    await roomClient.query('ROLLBACK')
    throw new Error('Failed to auto-create rooms: ' + err.message)
  } finally {
    roomClient.release()
  }
}

// ─── Helper: lấy danh sách hotels của admin ────────────────────
async function getAdminHotels(adminId) {
  const result = await pool.query(
    `SELECT h.id, h.name, h.created_at,
            (SELECT COUNT(*) FROM branches b WHERE b.hotel_id = h.id) AS branch_count
     FROM hotels h
     JOIN admin_hotels ah ON ah.hotel_id = h.id
     WHERE ah.admin_id = $1
     ORDER BY h.created_at ASC`,
    [adminId]
  )
  return result.rows
}

// ── REGISTER ───────────────────────────────────────────────────
const register = async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { username, password, email, role, inviteCode, hotelName } = req.body

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, message: 'Username, password, and email are required' })
    }

    const existUser = await client.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email])
    if (existUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    let hotelId = null
    let branchId = null
    const userId = uuidv4()

    if (role === 'admin') {
      if (!hotelName) {
        return res.status(400).json({ success: false, message: 'Hotel name is required for admin' })
      }
      hotelId = uuidv4()
      branchId = uuidv4()
      const newInviteCode = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await client.query('INSERT INTO hotels (id, name) VALUES ($1, $2)', [hotelId, hotelName])
      await client.query(
        'INSERT INTO branches (id, hotel_id, name, invite_code, invite_code_expires_at) VALUES ($1, $2, $3, $4, $5)',
        [branchId, hotelId, 'Chi nhánh chính', newInviteCode, expiresAt]
      )

      // Tạo user trước
      await client.query(
        'INSERT INTO users (id, hotel_id, branch_id, username, email, password, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, hotelId, branchId, username, email, hashedPassword, role]
      )

      // Liên kết admin <-> hotel (nhiều-nhiều)
      await client.query(
        'INSERT INTO admin_hotels (admin_id, hotel_id) VALUES ($1, $2)',
        [userId, hotelId]
      )

      await client.query('COMMIT')

      // Tạo phòng ngoài transaction (dùng roomDb riêng)
      await autoCreateRooms(branchId)

    } else if (role === 'staff') {
      if (!inviteCode) {
        return res.status(400).json({ success: false, message: 'Invite code is required for staff' })
      }
      const branchRes = await client.query(
        'SELECT id, hotel_id, invite_code_expires_at FROM branches WHERE invite_code = $1',
        [inviteCode]
      )
      if (branchRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid invite code' })
      }
      const branch = branchRes.rows[0]
      if (branch.invite_code_expires_at && new Date() > new Date(branch.invite_code_expires_at)) {
        return res.status(400).json({ success: false, message: 'Invite code has expired' })
      }
      branchId = branch.id
      hotelId = branch.hotel_id

      await client.query(
        'INSERT INTO users (id, hotel_id, branch_id, username, email, password, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, hotelId, branchId, username, email, hashedPassword, role]
      )
      await client.query('COMMIT')
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' })
    }

    await publishEvent('auth_events', 'user.registered', {
      userId, email, role, hotelId, branchId, timestamp: new Date()
    })

    res.status(201).json({ success: true, message: 'User registered successfully' })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) {}
    next(err)
  } finally {
    client.release()
  }
}

// ── LOGIN ──────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username và password là bắt buộc' })
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Sai username hoặc password' })
    }
    const user = result.rows[0]

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Sai username hoặc password' })
    }

    // Admin: kèm danh sách hotels
    let hotels = []
    if (user.role === 'admin') {
      hotels = await getAdminHotels(user.id)
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      hotel_id: user.hotel_id,
      branch_id: user.branch_id,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    )

    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      hotel_id: user.hotel_id,
      branch_id: user.branch_id,
    }
    await redisClient.setEx(`user:${user.id}`, 900, JSON.stringify(userPayload))

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { accessToken, refreshToken, user: userPayload, hotels },
    })
  } catch (err) {
    next(err)
  }
}

// ── SWITCH HOTEL ───────────────────────────────────────────────
// POST /api/auth/switch-hotel  { hotel_id }
const switchHotel = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới được chuyển hotel' })
    }

    const { hotel_id } = req.body
    if (!hotel_id) {
      return res.status(400).json({ success: false, message: 'hotel_id là bắt buộc' })
    }

    // Kiểm tra quyền admin trên hotel này
    const access = await pool.query(
      'SELECT 1 FROM admin_hotels WHERE admin_id = $1 AND hotel_id = $2',
      [decoded.id, hotel_id]
    )
    if (access.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý hotel này' })
    }

    // Lấy branch đầu tiên làm default
    const branchRes = await pool.query(
      'SELECT id FROM branches WHERE hotel_id = $1 ORDER BY created_at ASC LIMIT 1',
      [hotel_id]
    )
    if (branchRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel này chưa có chi nhánh nào' })
    }
    const branch_id = branchRes.rows[0].id

    // Cập nhật active context trong DB
    await pool.query(
      'UPDATE users SET hotel_id = $1, branch_id = $2 WHERE id = $3',
      [hotel_id, branch_id, decoded.id]
    )

    // Cập nhật Redis
    const updatedUser = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      hotel_id,
      branch_id,
    }
    await redisClient.setEx(`user:${decoded.id}`, 900, JSON.stringify(updatedUser))

    // Cấp token mới với context mới
    const newPayload = { id: decoded.id, username: decoded.username, role: decoded.role, hotel_id, branch_id }
    const newAccessToken = generateAccessToken(newPayload)
    const newRefreshToken = generateRefreshToken(newPayload)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), decoded.id, newRefreshToken, expiresAt]
    )

    res.json({
      success: true,
      message: 'Đã chuyển hotel thành công',
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken, user: updatedUser },
    })
  } catch (err) {
    next(err)
  }
}

// ── CREATE HOTEL ───────────────────────────────────────────────
// POST /api/auth/hotels  { hotelName }
const createHotel = async (req, res, next) => {
  const client = await pool.connect()
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới được tạo hotel' })
    }

    const { hotelName } = req.body
    if (!hotelName) {
      return res.status(400).json({ success: false, message: 'Tên hotel là bắt buộc' })
    }

    await client.query('BEGIN')

    const hotelId = uuidv4()
    const branchId = uuidv4()
    const newInviteCode = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await client.query('INSERT INTO hotels (id, name) VALUES ($1, $2)', [hotelId, hotelName])
    await client.query(
      'INSERT INTO branches (id, hotel_id, name, invite_code, invite_code_expires_at) VALUES ($1, $2, $3, $4, $5)',
      [branchId, hotelId, 'Chi nhánh chính', newInviteCode, expiresAt]
    )
    await client.query(
      'INSERT INTO admin_hotels (admin_id, hotel_id) VALUES ($1, $2)',
      [decoded.id, hotelId]
    )

    await client.query('COMMIT')
    await autoCreateRooms(branchId)

    res.status(201).json({
      success: true,
      message: 'Tạo hotel thành công',
      data: { id: hotelId, name: hotelName, branch_id: branchId, invite_code: newInviteCode },
    })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) {}
    next(err)
  } finally {
    client.release()
  }
}

// ── GET MY HOTELS ──────────────────────────────────────────────
// GET /api/auth/hotels
const getMyHotels = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền' })
    }

    const hotels = await getAdminHotels(decoded.id)
    res.json({ success: true, data: hotels })
  } catch (err) {
    next(err)
  }
}

// ── REFRESH TOKEN ──────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token là bắt buộc' })
    }

    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ hoặc đã hết hạn' })
    }

    const decoded = verifyToken(refreshToken)
    const payload = {
      id: decoded.id, username: decoded.username, role: decoded.role,
      hotel_id: decoded.hotel_id, branch_id: decoded.branch_id,
    }
    const newAccessToken = generateAccessToken(payload)
    res.json({ success: true, data: { accessToken: newAccessToken } })
  } catch (err) {
    next(err)
  }
}

// ── LOGOUT ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
    }
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.decode(authHeader.split(' ')[1])
        if (decoded && decoded.id) await redisClient.del(`user:${decoded.id}`)
      } catch (_) {}
    }
    res.json({ success: true, message: 'Đăng xuất thành công' })
  } catch (err) {
    next(err)
  }
}

// ── GET ME ────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    const cached = await redisClient.get(`user:${decoded.id}`)
    if (cached) {
      const userCached = JSON.parse(cached)
      let hotels = []
      if (userCached.role === 'admin') hotels = await getAdminHotels(decoded.id)
      return res.json({ success: true, data: { user: userCached, hotels, source: 'cache' } })
    }

    const result = await pool.query(
      'SELECT id, username, email, role, hotel_id, branch_id, created_at FROM users WHERE id = $1',
      [decoded.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' })
    }
    const user = result.rows[0]
    await redisClient.setEx(`user:${user.id}`, 900, JSON.stringify(user))

    let hotels = []
    if (user.role === 'admin') hotels = await getAdminHotels(user.id)

    res.json({ success: true, data: { user, hotels, source: 'database' } })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' })
    }
    next(err)
  }
}

// ── GET BRANCH SETTINGS ───────────────────────────────────────
const getBranchSettings = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    const result = await pool.query(
      'SELECT id, name, invite_code, invite_code_expires_at FROM branches WHERE id = $1',
      [decoded.branch_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh' })
    }
    const branchData = result.rows[0]
    if (decoded.role !== 'admin') {
      delete branchData.invite_code
      delete branchData.invite_code_expires_at
    }
    res.json({ success: true, data: branchData })
  } catch (err) {
    next(err)
  }
}

// ── REFRESH INVITE CODE ───────────────────────────────────────
const refreshInviteCode = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền tạo lại mã mời' })
    }

    const newInviteCode = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const result = await pool.query(
      'UPDATE branches SET invite_code = $1, invite_code_expires_at = $2 WHERE id = $3 RETURNING id, name, invite_code, invite_code_expires_at',
      [newInviteCode, expiresAt, decoded.branch_id]
    )
    res.json({ success: true, message: 'Tạo mã mời mới thành công', data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  register, login, switchHotel, createHotel, getMyHotels,
  refreshToken, logout, getMe, getBranchSettings, refreshInviteCode,
}
