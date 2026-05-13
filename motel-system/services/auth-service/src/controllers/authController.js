const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { client: redisClient } = require('../redis')
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt')
const jwt = require('jsonwebtoken')
const roomDbPool = require('../roomDb')

// ── REGISTER ───────────────────────────────────────────────────
const register = async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { username, password, email, role, inviteCode, hotelName } = req.body

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, message: 'Username, password, and email are required' })
    }

    // Check existing user
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

      // Create hotel and default branch
      await client.query('INSERT INTO hotels (id, name) VALUES ($1, $2)', [hotelId, hotelName])
      await client.query('INSERT INTO branches (id, hotel_id, name, invite_code) VALUES ($1, $2, $3, $4)', [branchId, hotelId, 'Chi nhánh chính', newInviteCode])
      
      // Auto-generate 10 rooms in room_db
      const roomClient = await roomDbPool.connect()
      try {
        await roomClient.query('BEGIN')
        for (let i = 1; i <= 10; i++) {
          const roomNumber = `1${i.toString().padStart(2, '0')}`
          await roomClient.query(`INSERT INTO rooms (branch_id, room_number, floor, type, base_price, hourly_base_price, hourly_extra_price) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [branchId, roomNumber, 1, 'single', 200000, 60000, 20000])
        }
        await roomClient.query('COMMIT')
      } catch (err) {
        await roomClient.query('ROLLBACK')
        console.error('Error auto-creating rooms:', err)
        // Note: we might fail the whole transaction or just let the user be created and log the error.
        // Let's fail it so it is consistent.
        throw new Error('Failed to auto-create rooms')
      } finally {
        roomClient.release()
      }

    } else if (role === 'staff') {
      if (!inviteCode) {
        return res.status(400).json({ success: false, message: 'Invite code is required for staff' })
      }
      const branchRes = await client.query('SELECT id, hotel_id FROM branches WHERE invite_code = $1', [inviteCode])
      if (branchRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid invite code' })
      }
      branchId = branchRes.rows[0].id
      hotelId = branchRes.rows[0].hotel_id
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' })
    }

    await client.query(
      'INSERT INTO users (id, hotel_id, branch_id, username, email, password, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, hotelId, branchId, username, email, hashedPassword, role]
    )

    await client.query('COMMIT')
    res.status(201).json({ success: true, message: 'User registered successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
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
      return res.status(400).json({
        success: false,
        message: 'Username và password là bắt buộc',
      })
    }

    // Tìm user trong DB
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Sai username hoặc password',
      })
    }

    const user = result.rows[0]

    // So sánh password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Sai username hoặc password',
      })
    }

    // Tạo tokens (Chương 5: Định danh qua JWT)
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      hotel_id: user.hotel_id,
      branch_id: user.branch_id,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Lưu refresh token vào DB
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    )

    // Cache user info vào Redis (Chương 4: Trao đổi thông tin)
    await redisClient.setEx(
      `user:${user.id}`,
      900, // 15 phút
      JSON.stringify({ id: user.id, username: user.username, email: user.email, role: user.role, hotel_id: user.hotel_id, branch_id: user.branch_id })
    )

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          hotel_id: user.hotel_id,
          branch_id: user.branch_id,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── REFRESH TOKEN ──────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token là bắt buộc',
      })
    }

    // Kiểm tra token trong DB
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn',
      })
    }

    // Verify token
    const decoded = verifyToken(refreshToken)

    // Tạo access token mới
    const payload = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      hotel_id: decoded.hotel_id,
      branch_id: decoded.branch_id,
    }

    const newAccessToken = generateAccessToken(payload)

    res.json({
      success: true,
      data: { accessToken: newAccessToken },
    })
  } catch (err) {
    next(err)
  }
}

// ── LOGOUT ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      // Xoá refresh token khỏi DB
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      )
    }

    // Xoá cache Redis nếu có userId
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1]
        // Dùng decode thay vì verify vì token Access có thể đã hết hạn lúc người dùng bấm logout
        const decoded = jwt.decode(token)
        if (decoded && decoded.id) {
          await redisClient.del(`user:${decoded.id}`)
        }
      } catch (_) {}
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ── GET ME ────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token',
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    // Thử lấy từ Redis cache trước (Chương 4: Cache)
    const cached = await redisClient.get(`user:${decoded.id}`)
    if (cached) {
      return res.json({
        success: true,
        data: { user: JSON.parse(cached), source: 'cache' },
      })
    }

    // Không có cache thì query DB
    const result = await pool.query(
      'SELECT id, username, email, role, hotel_id, branch_id, created_at FROM users WHERE id = $1',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user',
      })
    }

    const user = result.rows[0]

    // Lưu lại cache
    await redisClient.setEx(`user:${user.id}`, 900, JSON.stringify(user))

    res.json({
      success: true,
      data: { user, source: 'database' },
    })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn',
      })
    }
    next(err)
  }
}

module.exports = { register, login, refreshToken, logout, getMe }