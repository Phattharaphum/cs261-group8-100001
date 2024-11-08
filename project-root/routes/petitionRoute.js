// project-root/routes/petitionRoute.js
const express = require('express');
const router = express.Router();
const sql = require('../config/db.config');

router.post('/submit-petition', (req, res) => {
    const {
        student_id, student_name, major, year, address,
        student_phone, guardian_phone, petition_type, semester,
        subject_code, subject_name, section
    } = req.body;

    const query = `
        INSERT INTO petition (student_id, student_name, major, year, address, student_phone, guardian_phone, petition_type, semester, subject_code, subject_name, section, status)
        VALUES (@student_id, @student_name, @major, @year, @address, @student_phone, @guardian_phone, @petition_type, @semester, @subject_code, @subject_name, @section, 1)
    `;

    sql.connect().then(pool => {
        return pool.request()
            .input('student_id', sql.NVarChar, student_id)
            .input('student_name', sql.NVarChar, student_name)
            .input('major', sql.NVarChar, major)
            .input('year', sql.Int, year)
            .input('address', sql.NVarChar, address)
            .input('student_phone', sql.NVarChar, student_phone)
            .input('guardian_phone', sql.NVarChar, guardian_phone)
            .input('petition_type', sql.NVarChar, petition_type)
            .input('semester', sql.NVarChar, semester)
            .input('subject_code', sql.NVarChar, subject_code)
            .input('subject_name', sql.NVarChar, subject_name)
            .input('section', sql.NVarChar, section)
            .query(query);
    }).then(result => {
        res.status(201).json({ message: 'Petition submitted successfully' });
    }).catch(err => {
        console.error('Error inserting petition:', err);
        res.status(500).json({ error: 'Failed to submit petition' });
    }).finally(() => {
        sql.close();
    });
});

module.exports = router;
