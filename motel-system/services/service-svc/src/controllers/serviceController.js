const pool = require('../db')

const getServices = async (req, res, next) => {
  try {
    const { branch_id } = req.query
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    const result = await pool.query('SELECT * FROM services WHERE branch_id = $1 AND is_active = true ORDER BY name ASC', [branch_id])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

const createService = async (req, res, next) => {
  try {
    const { branch_id, name, description, price } = req.body
    if (!branch_id || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'branch_id, name, and price are required' })
    }

    const result = await pool.query(
      'INSERT INTO services (branch_id, name, description, price) VALUES ($1, $2, $3, $4) RETURNING *',
      [branch_id, name, description, price]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, price, is_active } = req.body
    
    const result = await pool.query(
      'UPDATE services SET name = COALESCE($1, name), description = COALESCE($2, description), price = COALESCE($3, price), is_active = COALESCE($4, is_active) WHERE id = $5 RETURNING *',
      [name, description, price, is_active, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params
    // We do a soft delete (is_active = false)
    const result = await pool.query('UPDATE services SET is_active = false WHERE id = $1 RETURNING *', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' })
    }

    res.json({ success: true, message: 'Service deactivated successfully' })
  } catch (err) {
    next(err)
  }
}

const getBookingServices = async (req, res, next) => {
  try {
    const { booking_id } = req.params

    const result = await pool.query(
      `SELECT bs.*, s.name, s.price 
       FROM booking_services bs 
       JOIN services s ON bs.service_id = s.id 
       WHERE bs.booking_id = $1 
       ORDER BY bs.created_at ASC`,
      [booking_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

const addServiceToBooking = async (req, res, next) => {
  try {
    const { booking_id } = req.params
    const { service_id, quantity } = req.body

    if (!service_id || !quantity) {
      return res.status(400).json({ success: false, message: 'service_id and quantity are required' })
    }

    // Get the service price
    const serviceRes = await pool.query('SELECT price FROM services WHERE id = $1', [service_id])
    if (serviceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' })
    }

    const price = serviceRes.rows[0].price
    const total_price = Number(price) * Number(quantity)

    const result = await pool.query(
      'INSERT INTO booking_services (booking_id, service_id, quantity, total_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [booking_id, service_id, quantity, total_price]
    )

    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getServices,
  createService,
  updateService,
  deleteService,
  getBookingServices,
  addServiceToBooking
}
