class OtaAdapter {
  constructor(apiKey, secret) {
    this.apiKey = apiKey;
    this.secret = secret;
  }

  /**
   * Lấy danh sách booking từ OTA (Online Travel Agency)
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<Array>} Danh sách booking
   */
  async fetchBookings(startDate, endDate) {
    throw new Error('Method fetchBookings() must be implemented by concrete subclass.');
  }

  /**
   * Đồng bộ số lượng phòng trống và giá lên OTA
   * @param {string} roomId Mã phòng trong hệ thống của OTA
   * @param {number} availableQuantity Số lượng phòng trống
   * @param {number} price Giá phòng cập nhật
   */
  async syncInventory(roomId, availableQuantity, price) {
    throw new Error('Method syncInventory() must be implemented by concrete subclass.');
  }
}

module.exports = OtaAdapter;
