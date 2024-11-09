// authMiddleware.js

const SESSION_TIMEOUT = 5 * 60 * 1000; // Example: 15 minutes

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    const now = Date.now();
    const sessionAge = now - (req.session.createdAt || now);

    if (sessionAge > SESSION_TIMEOUT) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error logging out:", err);
          return res.status(500).json({ message: "Error logging out" });
        }
        return res
          .status(401)
          .json({ message: "Session expired. Please log in again." });
      });
    } else {
      req.session.createdAt = now; // Refresh session time
      next();
    }
  } else {
    res.status(401).json({ message: "Unauthorized access. Please log in." });
  }
}

// Middleware to verify student access
function isStudent(req, res, next) {
  if (
    req.session &&
    req.session.user &&
    req.session.user.userType === "student"
  ) {
    return next();
  } else {
    res.status(403).json({ message: "Access restricted to students only" });
  }
}

// Middleware to verify teacher access
function isTeacher(req, res, next) {
  if (
    req.session &&
    req.session.user &&
    req.session.user.userType === "teacher"
  ) {
    return next();
  } else {
    res.status(403).json({ message: "Access restricted to teachers only" });
  }
}

module.exports = {
  isAuthenticated,
  isStudent,
  isTeacher,
};
