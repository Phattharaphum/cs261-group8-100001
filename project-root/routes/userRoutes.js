const express = require('express');
const router = express.Router();

// ตัวอย่างเส้นทางใน userRoutes
router.get('/users', (req, res) => {
    res.send('User list');
});

module.exports = router;
