document.addEventListener("DOMContentLoaded", function () {
    async function getApiKey() {
        try {
            const response = await fetch('/api/get-api-key');
            const data = await response.json();
            return data.apiKey;
        } catch (error) {
            console.error('Error fetching API Key:', error);
            return null;
        }
    }

    // กำหนดตัวแปรที่เชื่อมต่อกับ element ต่างๆ ใน HTML
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const modal = document.getElementById('loginModal');
    const modalContent = document.getElementById('modal-content');
    const closeModalButton = document.getElementById('closeModal');

    const usernameBox = document.getElementById('userbox');
    const passwordBox = document.getElementById('passbox');

    // เมื่อมีการป้อนข้อมูลใน input จะตรวจสอบความถูกต้อง
    usernameInput.addEventListener('input', validateInputs);
    passwordInput.addEventListener('input', validateInputs); // ตรวจสอบรหัสผ่านด้วย

    // ฟังก์ชันตรวจสอบความถูกต้องของข้อมูลในฟอร์ม
    function validateInputs() {
        const usernameValid = /^\d{10}$/.test(usernameInput.value); // ตรวจสอบว่า username เป็นตัวเลข 10 หลัก
        const passwordValid = passwordInput.value.length >= 6; // ตรวจสอบว่ารหัสผ่านมากกว่า 6 ตัวอักษร

        // เปลี่ยนสีขอบ input box ตามเงื่อนไข
        if (!usernameValid) {
            usernameBox.style.border = '3px solid #9d0208'; // ขอบแดงถ้า username ไม่ถูกต้อง
        } else {
            usernameBox.style.border = '2px solid #495057'; // ขอบปกติถ้าถูกต้อง
        }

        if (!passwordValid) {
            passwordBox.style.border = '3px solid #9d0208'; // ขอบแดงถ้ารหัสผ่านน้อยกว่า 6 ตัวอักษร
        } else {
            passwordBox.style.border = '2px solid #495057'; // ขอบปกติถ้าถูกต้อง
        }
    }

    // ฟังก์ชันจัดการการล็อกอินเมื่อผู้ใช้ส่งฟอร์ม
    async function submitLogin() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        // แสดง error modal ถ้า username หรือ password เป็นค่าว่าง
        if (!username || !password) {
            showModal(`
                <p class="login-failed"><span class="spatata">Alert !</span></p>
                <p class="login-failed-message">Username and Password Fields Must Be Filled.</p>
            `);
            return; 
        }

        const usernameValid = /^\d{10}$/.test(username); // ตรวจสอบว่า username เป็นตัวเลข 10 หลัก
        const passwordValid = password.length >= 6; // ตรวจสอบว่ารหัสผ่านมีมากกว่า 6 ตัวอักษร

        // แสดง modal ข้อความเตือนหาก username หรือ password ไม่ถูกต้อง
        if (!usernameValid) {
            showModal(`
                <p class="login-failed">Alert !</p>
                <p class="login-failed-message">Username must be 10 digits</p>
            `);
            return;
        }

        if (!passwordValid) {
            showModal(`
                <p class="login-failed">Alert !</p>
                <p class="login-failed-message">Password must be at least 6 characters long</p>
            `);
            return;
        }
        const apiKey = await getApiKey();
        // ถ้าข้อมูลถูกต้อง ส่งคำขอล็อกอินไปที่ API
        if (usernameValid && passwordValid) {
            
            fetch('https://restapi.tu.ac.th/api/v1/auth/Ad/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Application-Key': apiKey
                },
                body: JSON.stringify({
                    UserName: username,
                    PassWord: password
                })
            })
            .then(response => response.json()) // รอรับผลลัพธ์จาก API
            .then(data => {
                // ถ้าล็อกอินสำเร็จ แสดงข้อมูลผู้ใช้
                if (data.status === true) {
                    showModal(`
                        <p class="login-success">Login successful !</p>
                        <p class="username"><span class="spatata">Username:</span> ${data.username}</p>
                        <p class="email"><span class="spatata">Email:</span> ${data.email}</p>
                        <p class="displayname-en"><span class="spatata">Name (EN):</span> ${data.displayname_en}</p>
                        <p class="displayname-th"><span class="spatata">Name (TH):</span> ${data.displayname_th}</p>
                        <p class="faculty"><span class="spatata">Faculty:</span> ${data.faculty}</p>
                        <p class="department"><span class="spatata">Department:</span> ${data.department}</p>
                    `);
                    // เคลียร์ฟิลด์เมื่อสำเร็จ
                    usernameInput.value = '';
                    passwordInput.value = '';
                } else {
                    // ถ้าล็อกอินล้มเหลวแสดงข้อความผิดพลาด
                    showModal(`
                        <p class="login-failed">Login Failed !</p>
                        <p class="login-failed-message">${data.message}</p>
                    `);
                }
            })
            .catch(error => {
                // จัดการกรณีมีข้อผิดพลาดในการเชื่อมต่อ
                showModal(`
                    <p class="login-failed">Error !</p>
                    <p class="login-failed-message">Error: ${error}</p>
                `);
            });
        }
    }

    // สร้าง backdrop เมื่อ modal เปิด
    const modalBackdrop = document.createElement('div');
    modalBackdrop.classList.add('modal-backdrop');
    document.body.appendChild(modalBackdrop);

    // ฟังก์ชันแสดง modal
    function showModal(content) {
        modalContent.innerHTML = content;
        modal.style.display = 'block';
        modalBackdrop.style.display = 'block'; 
    }

    // ฟังก์ชันปิด modal เมื่อคลิกปุ่มปิด
    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
        modalBackdrop.style.display = 'none'; 
    });

    // ฟังก์ชันสำหรับล็อกอิน (เชื่อมโยงกับปุ่มใน HTML)
    window.submitLogin = submitLogin;

    // ฟังก์ชันเปลี่ยนประเภท input ระหว่าง password และ text เพื่อแสดง/ซ่อนรหัสผ่าน
    const togglePasswordButton = document.getElementById('togglePassword');

    togglePasswordButton.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // เปลี่ยนข้อความระหว่าง Show และ Hide
        this.textContent = type === 'password' ? 'Show' : 'Hide';
    });
});
