const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
  })
}

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
}

module.exports = { errorHandler, notFound }