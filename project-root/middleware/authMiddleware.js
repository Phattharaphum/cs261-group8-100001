// Middleware to clear session and redirect to login
function handleUnauthorizedAccess(req, res) {
  /*
  req.session.destroy((err) => {
    if (err) {
      console.error("Failed to destroy session:", err);
    }
    res.clearCookie("connect.sid"); // Clear the session cookie

    // Check if the request is an AJAX request (via fetch)
    if (req.xhr || req.headers.accept.includes("application/json")) {
      // AJAX request - send JSON response
      res.status(401).json({
        message: "Unauthorized. Redirecting to login.",
        redirect: "/index.html",
      });
    } else {
      // Direct browser navigation - redirect directly
      res.redirect("/index.html");
    }
  });*/
}

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    handleUnauthorizedAccess(req, res);
  }
}

// Middleware to check if the user is a student
function isStudent(req, res, next) {
  if (req.session.user && req.session.user.userType === "student") {
    return next();
  } else {
    handleUnauthorizedAccess(req, res);
  }
}

// Middleware to check if the user is a teacher
function isTeacher(req, res, next) {
  if (req.session.user && req.session.user.userType === "teacher") {
    return next();
  } else {
    handleUnauthorizedAccess(req, res);
  }
}

function isAcademicStaff(req, res, next) {
  if (req.session.user && req.session.user.userType === "academicStaff") {
    return next();
  } else {
    handleUnauthorizedAccess(req, res);
  }
}

module.exports = { isAuthenticated, isStudent, isTeacher, isAcademicStaff };
