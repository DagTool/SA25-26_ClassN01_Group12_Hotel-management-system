const ChannelManagerService = require('./services/ChannelManagerService');

async function testOTA() {
  console.log('--- TEST BẮT ĐẦU ---');
  
  // 1. Kéo dữ liệu từ tất cả các kênh (Fetch Bookings)
  const bookings = await ChannelManagerService.syncAllBookings();
  
  console.log('\n================ DANH SÁCH BOOKING NHẬN VỀ ================');
  console.table(bookings);

  console.log('\n================ THỐNG KÊ ================');
  console.log(`Booking.com: ${bookings.filter(b => b.source === 'Booking.com').length} đơn`);
  console.log(`Airbnb: ${bookings.filter(b => b.source === 'Airbnb').length} đơn`);
  console.log(`Trip.com: ${bookings.filter(b => b.source === 'Trip.com').length} đơn`);

  // 2. Giả lập báo trạng thái phòng trống lên kênh OTA (Sync Inventory)
  console.log('\n--- TEST ĐỒNG BỘ PHÒNG TRỐNG ---');
  await ChannelManagerService.pushInventoryToAll('ROOM-101', 1, 200000);
}

testOTA();
