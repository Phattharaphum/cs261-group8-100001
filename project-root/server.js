const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const dotenv = require('dotenv');

dotenv.config(); // โหลด environment variables จาก .env

app.use(express.json()); // รองรับการรับข้อมูล JSON
app.use(express.static('public')); // ให้บริการไฟล์ static จากโฟลเดอร์ public

// กำหนดเส้นทาง
app.use('/api', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
