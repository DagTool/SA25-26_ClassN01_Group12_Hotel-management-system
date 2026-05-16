const OtaAdapter = require('./OtaAdapter');

class TripAdapter extends OtaAdapter {
  constructor(apiKey, secret, hotelId) {
    super(apiKey, secret);
    this.hotelId = hotelId;
    this.baseUrl = 'https://trip.com/api/v3';
  }

  async fetchBookings(startDate, endDate) {
    console.log(`[Trip.com / Agoda] Lấy danh sách phòng đặt cho hotel ${this.hotelId}...`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            otaBookingId: 'TRP-987654',
            guestName: 'Nguyen Van A',
            roomType: 'Suite',
            checkIn: '2026-06-01T14:00:00Z',
            checkOut: '2026-06-05T12:00:00Z',
            totalPrice: 5000000,
            status: 'PAID',
            source: 'Trip.com'
          },
          {
            otaBookingId: 'TRP-987655',
            guestName: 'Le Thi B',
            roomType: 'Standard',
            checkIn: '2026-05-19T14:00:00Z',
            checkOut: '2026-05-21T12:00:00Z',
            totalPrice: 900000,
            status: 'PAID',
            source: 'Trip.com'
          }
        ]);
      }, 600);
    });
  }

  async syncInventory(roomId, availableQuantity, price) {
    console.log(`[Trip.com / Agoda] Đẩy allotment (quỹ phòng) cho mã phòng ${roomId} - Trống: ${availableQuantity}`);
    return Promise.resolve({ success: true, message: 'Allotment pushed to Trip.com' });
  }
}

module.exports = TripAdapter;
