const BookingDotComAdapter = require('./BookingDotComAdapter');
const AirbnbAdapter = require('./AirbnbAdapter');
const TripAdapter = require('./TripAdapter');

class OtaFactory {
  /**
   * Trả về Instance của Adapter dựa trên tên Provider
   * @param {string} providerName Tên của OTA (Booking.com, Airbnb, Trip,...)
   * @param {Object} config Cấu hình API Key, Secret tương ứng
   * @returns {OtaAdapter}
   */
  static getAdapter(providerName, config) {
    switch (providerName.toLowerCase()) {
      case 'booking.com':
        return new BookingDotComAdapter(config.apiKey, config.secret, config.propertyId);
      case 'airbnb':
        return new AirbnbAdapter(config.apiKey, config.secret, config.hostId);
      case 'trip':
      case 'agoda':
        return new TripAdapter(config.apiKey, config.secret, config.hotelId);
      default:
        throw new Error(`OTA Provider '${providerName}' is not supported.`);
    }
  }
}

module.exports = OtaFactory;
