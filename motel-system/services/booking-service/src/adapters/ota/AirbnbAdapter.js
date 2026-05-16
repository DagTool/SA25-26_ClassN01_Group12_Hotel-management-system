const OtaAdapter = require('./OtaAdapter');

class AirbnbAdapter extends OtaAdapter {
  constructor(apiKey, secret, hostId) {
    super(apiKey, secret);
    this.hostId = hostId;
    this.baseUrl = 'https://api.airbnb.com/v2';
  }

  async fetchBookings(startDate, endDate) {
    console.log(`[Airbnb] Fetching reservations cho Host ${this.hostId}...`);
    
    // Giả lập gọi API Airbnb
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            otaBookingId: 'AIR-XYZ123',
            guestName: 'Alice Smith',
            roomType: 'Standard',
            checkIn: '2026-05-21T15:00:00Z',
            checkOut: '2026-05-23T11:00:00Z',
            totalPrice: 800000,
            status: 'ACCEPTED',
            source: 'Airbnb'
          },
          {
            otaBookingId: 'AIR-XYZ124',
            guestName: 'David Lee',
            roomType: 'Deluxe',
            checkIn: '2026-06-01T15:00:00Z',
            checkOut: '2026-06-05T11:00:00Z',
            totalPrice: 3200000,
            status: 'PENDING',
            source: 'Airbnb'
          }
        ]);
      }, 700);
    });
  }

  async syncInventory(roomId, availableQuantity, price) {
    console.log(`[Airbnb] Syncing calendar (lịch phòng) cho listing ${roomId} - Available: ${availableQuantity}`);
    // Airbnb thường dùng iCal hoặc API để khóa lịch phòng
    return Promise.resolve({ success: true, message: 'Calendar synced to Airbnb' });
  }
}

module.exports = AirbnbAdapter;
