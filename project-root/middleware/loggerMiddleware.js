function loggerMiddleware(req, res, next) {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next(); // ให้ผ่านไปยัง middleware หรือ route ต่อไป
}

module.exports = loggerMiddleware;
