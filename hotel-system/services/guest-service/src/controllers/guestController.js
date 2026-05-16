const pool = require('../db')

const getGuests = async (req, res, next) => {
  try {
    const { branch_id, search } = req.query
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    let query = 'SELECT * FROM guests WHERE branch_id = $1'
    let params = [branch_id]

    if (search) {
      query += ' AND (full_name ILIKE $2 OR phone ILIKE $2 OR id_number ILIKE $2)'
      params.push(`%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

const createGuest = async (req, res, next) => {
  try {
    const { branch_id, full_name, phone, id_number } = req.body
    if (!branch_id || !full_name) {
      return res.status(400).json({ success: false, message: 'branch_id and full_name are required' })
    }

    const result = await pool.query(
      'INSERT INTO guests (branch_id, full_name, phone, id_number) VALUES ($1, $2, $3, $4) RETURNING *',
      [branch_id, full_name, phone, id_number]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

const updateGuest = async (req, res, next) => {
  try {
    const { id } = req.params
    const { full_name, phone, id_number, loyalty_points } = req.body
    
    const result = await pool.query(
      'UPDATE guests SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), id_number = COALESCE($3, id_number), loyalty_points = COALESCE($4, loyalty_points) WHERE id = $5 RETURNING *',
      [full_name, phone, id_number, loyalty_points, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guest not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

const toggleBlacklist = async (req, res, next) => {
  try {
    const { id } = req.params
    const { is_blacklisted } = req.body

    if (is_blacklisted === undefined) {
      return res.status(400).json({ success: false, message: 'is_blacklisted boolean is required' })
    }

    const result = await pool.query(
      'UPDATE guests SET is_blacklisted = $1 WHERE id = $2 RETURNING *',
      [is_blacklisted, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Guest not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getGuests,
  createGuest,
  updateGuest,
  toggleBlacklist
}
