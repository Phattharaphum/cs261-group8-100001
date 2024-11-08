// project-root/routes/advisorRoutes.js

const express = require('express');
const router = express.Router();
const sql = require('../config/db.config'); // เชื่อมต่อฐานข้อมูล

// Route สำหรับดึงข้อมูลคำร้องของนักศึกษาที่มีสถานะ = 2
router.get('/advisor-petitions', async (req, res) => {
    const advisorId = req.session.user?.username; // ใช้รหัสอาจารย์จาก session

    if (!advisorId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const query = `
            SELECT p.*
            FROM petition p
            JOIN advisor_info a ON p.student_id = a.student_id
            WHERE a.advisor_id = @advisorId AND p.status = 2
        `;

        const pool = await sql;
        const result = await pool.request()
            .input('advisorId', sql.NVarChar, advisorId)
            .query(query);

        res.json(result.recordset); // ส่งข้อมูลคำร้องไปยัง client
    } catch (error) {
        console.error('Error fetching petitions:', error);
        res.status(500).json({ error: 'Failed to fetch petitions' });
    }
});

module.exports = router;
