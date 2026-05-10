const pool = require('../db')

// --- Room Classes ---

const getRoomClasses = async (req, res, next) => {
  try {
    const { branch_id } = req.query
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    const result = await pool.query('SELECT * FROM room_classes WHERE branch_id = $1 ORDER BY base_price ASC', [branch_id])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

const createRoomClass = async (req, res, next) => {
  try {
    const { branch_id, name, base_price, hourly_base_price, hourly_extra_price } = req.body
    if (!branch_id || !name || !base_price) {
      return res.status(400).json({ success: false, message: 'branch_id, name, and base_price are required' })
    }

    const result = await pool.query(
      'INSERT INTO room_classes (branch_id, name, base_price, hourly_base_price, hourly_extra_price) VALUES ($1, $2, $3, COALESCE($4, 100000), COALESCE($5, 30000)) RETURNING *',
      [branch_id, name, base_price, hourly_base_price, hourly_extra_price]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ success: false, message: 'Room class name already exists for this branch' })
    }
    next(err)
  }
}

// --- Rooms ---

const getRooms = async (req, res, next) => {
  try {
    const { branch_id } = req.query
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    // Join with room_classes to get class name and price
    const query = `
      SELECT r.*, c.name as class_name, c.base_price, c.hourly_base_price, c.hourly_extra_price
      FROM rooms r
      JOIN room_classes c ON r.class_id = c.id
      WHERE r.branch_id = $1
      ORDER BY r.floor, r.room_number
    `
    const result = await pool.query(query, [branch_id])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

const createRoom = async (req, res, next) => {
  try {
    const { branch_id, class_id, room_number, floor } = req.body
    if (!branch_id || !class_id || !room_number || floor === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const result = await pool.query(
      'INSERT INTO rooms (branch_id, class_id, room_number, floor) VALUES ($1, $2, $3, $4) RETURNING *',
      [branch_id, class_id, room_number, floor]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Room number already exists in this branch' })
    }
    next(err)
  }
}

const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params
    const { class_id, room_number, floor } = req.body
    
    const result = await pool.query(
      'UPDATE rooms SET class_id = COALESCE($1, class_id), room_number = COALESCE($2, room_number), floor = COALESCE($3, floor) WHERE id = $4 RETURNING *',
      [class_id, room_number, floor, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

const updateRoomStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const allowedStatuses = ['available', 'occupied', 'cleaning', 'maintenance']

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const result = await pool.query(
      'UPDATE rooms SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' })
    }

    res.json({ success: true, message: 'Room deleted successfully' })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getRoomClasses,
  createRoomClass,
  getRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom
}
