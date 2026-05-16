const OtaAdapter = require('./OtaAdapter');

class BookingDotComAdapter extends OtaAdapter {
  constructor(apiKey, secret, propertyId) {
    super(apiKey, secret);
    this.propertyId = propertyId;
    this.baseUrl = 'https://api.booking.com/v1'; // Endpoint API thật của Booking.com
  }

  async fetchBookings(startDate, endDate) {
    console.log(`[Booking.com] Đang kéo dữ liệu phòng đặt từ ${startDate} đến ${endDate} cho Property ${this.propertyId}...`);
    
    // Giả lập gọi API thật (vd: axios.get(`${this.baseUrl}/reservations`, { headers: ... }))
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            otaBookingId: 'BKG-102938',
            guestName: 'John Doe',
            roomType: 'Deluxe',
            checkIn: '2026-05-20T14:00:00Z',
            checkOut: '2026-05-22T12:00:00Z',
            totalPrice: 1500000,
            status: 'CONFIRMED',
            source: 'Booking.com'
          },
          {
            otaBookingId: 'BKG-102939',
            guestName: 'Jane Smith',
            roomType: 'Standard',
            checkIn: '2026-05-18T14:00:00Z',
            checkOut: '2026-05-20T12:00:00Z',
            totalPrice: 800000,
            status: 'CANCELLED',
            source: 'Booking.com'
          },
          {
            otaBookingId: 'BKG-102940',
            guestName: 'Michael Brown',
            roomType: 'Suite',
            checkIn: '2026-05-25T14:00:00Z',
            checkOut: '2026-05-28T12:00:00Z',
            totalPrice: 4500000,
            status: 'CONFIRMED',
            source: 'Booking.com'
          }
        ]);
      }, 500);
    });
  }

  async syncInventory(roomId, availableQuantity, price) {
    console.log(`[Booking.com] Đồng bộ phòng ${roomId} - Số lượng: ${availableQuantity} - Giá: ${price}`);
    // Giả lập API POST update inventory lên Booking.com
    return Promise.resolve({ success: true, message: 'Inventory synced to Booking.com' });
  }
}

module.exports = BookingDotComAdapter;
