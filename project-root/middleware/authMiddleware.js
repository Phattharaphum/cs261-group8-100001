// authMiddleware.js

// Middleware ตรวจสอบว่าผู้ใช้ล็อกอินแล้ว
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

// Middleware ตรวจสอบว่าผู้ใช้เป็นนักศึกษา
function isStudent(req, res, next) {
    if (req.session.user && req.session.user.userType === 'student') {
        return next();
    } else {
        res.status(403).json({ message: 'Access restricted to students only' });
    }
}

// Middleware ตรวจสอบว่าผู้ใช้เป็นอาจารย์
function isTeacher(req, res, next) {
    if (req.session.user && req.session.user.userType === 'teacher') {
        return next();
    } else {
        res.status(403).json({ message: 'Access restricted to teachers only' });
    }
}

// Export middleware functions
module.exports = { isAuthenticated, isStudent, isTeacher };
