const pool = require('../db')
const axios = require('axios')

const ROOM_SERVICE_URL = process.env.ROOM_SERVICE_URL || 'http://localhost:3002/api/rooms'
const SERVICE_SVC_URL = process.env.SERVICE_SVC_URL || 'http://localhost:3003/api/services'

const getBookings = async (req, res, next) => {
  try {
    const { branch_id, status } = req.query
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'branch_id is required' })
    }

    let query = 'SELECT * FROM bookings WHERE branch_id = $1'
    let params = [branch_id]

    if (status) {
      query += ' AND status = $2'
      params.push(status)
    }

    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    next(err)
  }
}

const checkIn = async (req, res, next) => {
  // Bắt đầu transaction để đảm bảo toàn vẹn dữ liệu
  const client = await pool.connect()
  try {
    const { branch_id, room_id, guest_id, created_by, booking_type } = req.body

    if (!branch_id || !room_id || !guest_id || !created_by || !booking_type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    await client.query('BEGIN')

    // 1. Cập nhật trạng thái phòng sang 'occupied' qua room-service
    // Phải gọi API sang room-service để đảm bảo logic phân tán
    try {
      await axios.patch(`${ROOM_SERVICE_URL}/${room_id}/status`, {
        status: 'occupied'
      })
    } catch (err) {
      throw new Error('Failed to update room status. Room might be unavailable.')
    }

    // 2. Tạo record Booking mới
    const result = await client.query(
      `INSERT INTO bookings (branch_id, room_id, guest_id, created_by, booking_type, check_in, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'active') RETURNING *`,
      [branch_id, room_id, guest_id, created_by, booking_type]
    )

    await client.query('COMMIT')
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Check-in error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
}

const checkOut = async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { id } = req.params

    await client.query('BEGIN')

    // 1. Lấy thông tin booking
    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1 AND status = $2 FOR UPDATE', [id, 'active'])
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found or already checked out')
    }
    const booking = bookingResult.rows[0]

    // 2. Lấy thông tin giá phòng từ room-service
    // (Trong thực tế, nên lưu snapshot giá phòng lúc check-in vào bảng bookings. Ở đây ta lấy giá hiện tại)
    let roomClassesRes;
    try {
      roomClassesRes = await axios.get(`${ROOM_SERVICE_URL}?branch_id=${booking.branch_id}`)
    } catch (err) {
      throw new Error('Failed to get room details from room-service')
    }
    
    const roomInfo = roomClassesRes.data.data.find(r => r.id === booking.room_id)
    if (!roomInfo) throw new Error('Room details not found')

    // 3. Tính tiền phòng
    const checkOutTime = new Date()
    const checkInTime = new Date(booking.check_in)
    const hoursDiff = Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60)) // Làm tròn lên số giờ
    
    let totalRoomPrice = 0
    if (booking.booking_type === 'hourly') {
      const { hourly_base_price, hourly_extra_price } = roomInfo
      if (hoursDiff <= 1) {
        totalRoomPrice = Number(hourly_base_price)
      } else {
        totalRoomPrice = Number(hourly_base_price) + ((hoursDiff - 1) * Number(hourly_extra_price))
      }
    } else {
      // Giả sử daily thì tính số ngày
      const daysDiff = Math.max(1, Math.ceil(hoursDiff / 24))
      totalRoomPrice = daysDiff * Number(roomInfo.base_price)
    }

    // 4. Tính tiền dịch vụ
    let totalServicePrice = 0;
    try {
      const servicesRes = await axios.get(`${SERVICE_SVC_URL}/booking/${booking.id}`);
      if (servicesRes.data && servicesRes.data.success) {
        const services = servicesRes.data.data;
        totalServicePrice = services.reduce((sum, item) => sum + Number(item.total_price), 0);
      }
    } catch (err) {
      console.error('Warning: Failed to get booking services');
    }

    const totalAmount = totalRoomPrice + totalServicePrice;

    // 5. Cập nhật booking
    const updateRes = await client.query(
      `UPDATE bookings 
       SET check_out = $1, status = 'completed', total_amount = $2 
       WHERE id = $3 RETURNING *`,
      [checkOutTime, totalAmount, booking.id]
    )

    // 6. Cập nhật trạng thái phòng sang 'cleaning' qua room-service
    try {
      await axios.patch(`${ROOM_SERVICE_URL}/${booking.room_id}/status`, {
        status: 'cleaning'
      })
    } catch (err) {
      // Nếu thất bại đoạn này, booking vẫn hoàn tất nhưng phòng có thể sai trạng thái
      console.error('Warning: Failed to set room to cleaning status')
    }

    await client.query('COMMIT')
    res.json({ success: true, data: updateRes.rows[0], receipt: {
      stay_duration_hours: hoursDiff,
      room_price: totalRoomPrice,
      service_price: totalServicePrice,
      total_amount: totalAmount
    }})

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Check-out error:', err.message)
    res.status(500).json({ success: false, message: err.message })
  } finally {
    client.release()
  }
}

module.exports = {
  getBookings,
  checkIn,
  checkOut
}
