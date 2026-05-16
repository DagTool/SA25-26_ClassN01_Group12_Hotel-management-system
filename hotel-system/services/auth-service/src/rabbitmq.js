const amqp = require('amqplib');

let channel = null;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
    channel = await connection.createChannel();
    console.log('RabbitMQ connected successfully');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
  }
};

const publishEvent = async (exchange, routingKey, message) => {
  try {
    if (!channel) await connectRabbitMQ();
    if (channel) {
      await channel.assertExchange(exchange, 'topic', { durable: true });
      channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
    }
  } catch (error) {
    console.error('RabbitMQ publish error:', error);
  }
};

module.exports = { connectRabbitMQ, publishEvent };
