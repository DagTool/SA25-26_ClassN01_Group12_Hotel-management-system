const OtaFactory = require('../adapters/ota/OtaFactory');

/**
 * Channel Manager Service - Quản lý tập trung các OTA (Booking, Airbnb, Trip...)
 * Ở môi trường thực tế, lớp này sẽ đóng vai trò như một Channel Manager
 */
class ChannelManagerService {
  constructor() {
    // Thông thường mảng cấu hình này sẽ được lấy từ Database (bảng ota_configs)
    // Tương ứng với từng chi nhánh / khách sạn (branch_id)
    this.connectedOTAs = [
      {
        provider: 'Booking.com',
        config: { apiKey: 'bkg-api-123', secret: 'bkg-sec-456', propertyId: 'P12345' }
      },
      {
        provider: 'Airbnb',
        config: { apiKey: 'air-api-789', secret: 'air-sec-012', hostId: 'H9876' }
      },
      {
        provider: 'Trip',
        config: { apiKey: 'trp-api-345', secret: 'trp-sec-678', hotelId: 'HTL555' }
      }
    ];
  }

  /**
   * Kéo tất cả booking từ các kênh OTA về hệ thống Motel nội bộ
   */
  async syncAllBookings() {
    console.log('\n--- BẮT ĐẦU ĐỒNG BỘ BOOKING TỪ CÁC KÊNH OTA ---');
    const allBookings = [];
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Dự báo 30 ngày tới

    // Duyệt qua từng OTA đã cấu hình để kéo dữ liệu về
    for (const ota of this.connectedOTAs) {
      try {
        const adapter = OtaFactory.getAdapter(ota.provider, ota.config);
        const bookings = await adapter.fetchBookings(startDate, endDate);
        allBookings.push(...bookings);
      } catch (err) {
        console.error(`Lỗi khi lấy dữ liệu từ ${ota.provider}:`, err.message);
      }
    }

    console.log(`=> Đã lấy tổng cộng ${allBookings.length} lượt đặt phòng từ các kênh OTA.`);
    // TODO: Ghi vào PostgreSQL (Bảng `bookings`), xử lý tránh duplicate (dựa vào `otaBookingId`)
    console.log(allBookings);
    
    return allBookings;
  }

  /**
   * Đẩy số lượng phòng trống và giá phòng cập nhật lên tất cả các kênh (Update Inventory / Rate)
   * Gọi hàm này khi có khách Check-in nội bộ, hoặc có phòng trống mới.
   */
  async pushInventoryToAll(roomId, availableQuantity, price) {
    console.log(`\n--- PUSH INVENTORY FOR ROOM ${roomId} TO OTA ---`);
    for (const ota of this.connectedOTAs) {
      try {
        const adapter = OtaFactory.getAdapter(ota.provider, ota.config);
        await adapter.syncInventory(roomId, availableQuantity, price);
      } catch (err) {
        console.error(`Lỗi khi đồng bộ quỹ phòng lên ${ota.provider}:`, err.message);
      }
    }
    console.log('Hoàn tất đẩy quỹ phòng đồng loạt lên OTA.');
  }
}

module.exports = new ChannelManagerService();
