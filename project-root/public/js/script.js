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
        // ถ้าข้อมูลถูกต้อง ส่งคำขอล็อกอินไปที่ API
        if (usernameValid && passwordValid) {
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
        
                const data = await response.json();
        
                if (data.success) {
                    window.location.href = data.redirectUrl; // เปลี่ยนเส้นทางไปยังหน้าที่กำหนด
                } else {
                    // ถ้าล็อกอินล้มเหลวแสดงข้อความผิดพลาด
                    showModal(`
                        <p class="login-failed">Login Failed!</p>
                        <p class="login-failed-message">${data.message}</p>
                    `);
                }
            } catch (error) {
                // จัดการกรณีมีข้อผิดพลาดในการเชื่อมต่อ
                showModal(`
                    <p class="login-failed">Error!</p>
                    <p class="login-failed-message">Error: ${error}</p>
                `);
            }
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
