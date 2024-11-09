const SESSION_TIMEOUT = 5 * 60 * 1000; // Session timeout of 5 minutes

// Middleware to check if the user is authenticated and if the session is still valid
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    const now = Date.now();

    // Set `createdAt` if it doesn't exist
    if (!req.session.createdAt) {
      req.session.createdAt = now;
    }

    const sessionAge = now - req.session.createdAt;

    // Check if session has expired
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
      // Update session timestamp for active session
      req.session.createdAt = now;
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
    res.status(403).json({ message: "Access restricted to students only." });
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
    res.status(403).json({ message: "Access restricted to teachers only." });
  }
}

module.exports = {
  isAuthenticated,
  isStudent,
  isTeacher,
};
