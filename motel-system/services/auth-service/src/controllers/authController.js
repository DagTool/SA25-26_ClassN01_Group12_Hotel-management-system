const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const pool = require('../db')
const { client: redisClient } = require('../redis')
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt')
const jwt = require('jsonwebtoken')

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
      JSON.stringify({ id: user.id, username: user.username, email: user.email, role: user.role })
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
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
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

module.exports = { login, refreshToken, logout, getMe }