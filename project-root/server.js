const express = require("express");
const app = express();
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const sql = require("./config/db.config");
const userRoutes = require("./routes/userRoutes");
const {
  isAuthenticated,
  isStudent,
  isTeacher,
} = require("./middleware/authMiddleware");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();
const SESSION_TIMEOUT = 5 * 60 * 1000;

app.use(express.json());
app.use(express.static("public"));

// Set up session
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: SESSION_TIMEOUT,
    },
  })
);

// Middleware for logging and error handling
app.use(loggerMiddleware);
app.use(errorHandler);

app.get("/api/get-api-key", (req, res) => {
  res.json({ apiKey: process.env.API_KEY });
});

app.use("/api", userRoutes);

// Session info route
app.get("/session-info", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Session expired" });
  }
  const expiresIn = SESSION_TIMEOUT - (Date.now() - req.session.createdAt);
  if (expiresIn <= 0) {
    req.session.destroy();
    return res.status(401).json({ message: "Session expired" });
  }
  res.json({ expiresIn });
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const apiKey = process.env.API_KEY;

  try {
    if (username === "0001" && password === "test") {
      req.session.user = {
        username,
        userType: "teacher",
        email: "teacher@example.com",
      };
      req.session.createdAt = Date.now();
      console.log("[Backend] Teacher session set:", req.session.user);
      res.json({ success: true, redirectUrl: "/advisor-petitions" });
    } else {
      const response = await fetch(
        "https://restapi.tu.ac.th/api/v1/auth/Ad/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": apiKey,
          },
          body: JSON.stringify({ UserName: username, PassWord: password }),
        }
      );

      const data = await response.json();
      if (data.status === true) {
        req.session.user = {
          username: data.username,
          userType: "student",
          email: data.email,
        };
        req.session.createdAt = Date.now();
        console.log("[Backend] Student session set:", req.session.user);
        res.json({ success: true, redirectUrl: "/draft-petitions" });
      } else {
        res.json({ success: false, message: data.message });
      }
    }
  } catch (error) {
    console.error("Error connecting to TU API:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to connect to TU API" });
  }
});

// Define a route for serving the draftPetitions HTML page
// Serve the HTML page for draft petitions
app.get("/draft-petitions", isAuthenticated, isStudent, (req, res) => {
  console.log("[Route] Serving draftPetitions HTML page");
  res.sendFile(path.join(__dirname, "public", "draftPetitions.html"));
});

// Define a separate route to provide the draft petitions data as JSON
// Serve JSON data for draft petitions on a separate route
app.get(
  "/api/draft-petitions",
  isAuthenticated,
  isStudent,
  async (req, res) => {
    try {
      const studentId = req.session.user.username;
      const pool = await sql.connect();
      const result = await pool
        .request()
        .input("studentId", sql.NVarChar, studentId)
        .query(
          "SELECT * FROM petition WHERE student_id = @studentId AND status = 1"
        );

      console.log(
        "[Route] Sending draft petitions data as JSON:",
        result.recordset
      );
      res.json(result.recordset); // Send JSON data for petitions
    } catch (error) {
      console.error("Error fetching draft petitions:", error);
      res.status(500).json({ error: "Failed to fetch draft petitions" });
    }
  }
);

// Add the /student/petitions route with JSON response
app.get("/student/petitions", isAuthenticated, isStudent, async (req, res) => {
  try {
    const studentId = req.session.user.username;
    const pool = await sql.connect();
    const result = await pool
      .request()
      .input("studentId", sql.NVarChar, studentId)
      .query(
        "SELECT * FROM petition WHERE student_id = @studentId AND status IN (2, 3, 4, 5)"
      );
    res.json(result.recordset); // Return JSON response
  } catch (err) {
    console.error("Error fetching petitions:", err);
    res.status(500).json({ error: "Failed to fetch petitions" });
  }
});

// Advisor-specific routes
app.get("/advisor-petitions", isAuthenticated, isTeacher, (req, res) => {
  console.log("[Route] /advisor-petitions accessed by:", req.session.user);
  res.sendFile(path.join(__dirname, "public", "advisorPetitions.html"));
});

app.get(
  "/advisor/pending-petitions",
  isAuthenticated,
  isTeacher,
  async (req, res) => {
    try {
      const advisorId = req.session.user.username;
      const pool = await sql.connect();

      const pendingResult = await pool
        .request()
        .input("advisorId", sql.NVarChar, advisorId).query(`
        SELECT * FROM petition 
        WHERE status = 2 
        AND student_id IN (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)
      `);

      const reviewedResult = await pool
        .request()
        .input("advisorId", sql.NVarChar, advisorId).query(`
        SELECT * FROM petition 
        WHERE status IN (3, 4, 5) 
        AND student_id IN (SELECT student_id FROM advisor_info WHERE advisor_id = @advisorId)
      `);

      res.json({
        pending: pendingResult.recordset,
        reviewed: reviewedResult.recordset,
      });
    } catch (err) {
      console.error("Error fetching petitions:", err);
      res.status(500).json({ error: "Failed to fetch petitions" });
    }
  }
);

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.redirect("/index.html");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
