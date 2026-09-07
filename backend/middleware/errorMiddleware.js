function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(err);
  res.status(status).json({
    message: err.message || "Server error",
  });
}

module.exports = { notFound, errorHandler };
