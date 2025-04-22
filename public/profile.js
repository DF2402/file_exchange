// 全局變量
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// 檢查登入狀態
function checkAuth() {
    if (!token || !currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 顯示提示訊息
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

// 格式化日期
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-TW');
}

// 加載用戶資料
async function loadUserProfile() {
    if (!checkAuth()) return;
    try {
        const response = await fetch('/api/users/profile', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '獲取用戶資料失敗');
        }

        const data = await response.json();
        console.log(data);
        // 更新表單
        document.getElementById('profileUsername').value = data.username;
        document.getElementById('profileRole').value = data.role === 'admin' ? '管理員' : '一般用戶';
        document.getElementById('profileCreatedAt').value = formatDate(data.createdAt);
        document.getElementById('username').textContent = data.username;
    } catch (error) {
        console.error('加載用戶資料錯誤:', error);
        showAlert(error.message || '加載用戶資料失敗', 'danger');
    }
}

// 更新密碼
async function updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('請填寫所有密碼欄位');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('新密碼與確認密碼不匹配');
        return;
    }

    if (newPassword.length < 6) {
        alert('新密碼長度必須至少為6個字符');
        return;
    }

    try {
        const response = await fetch('http://localhost:3500/api/users/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '更新密碼失敗');
        }

        alert('密碼更新成功');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('更新密碼錯誤:', error);
        alert(error.message || '更新密碼失敗，請稍後再試');
    }
}

// 登出
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log(token);
    if (!checkAuth()) return;
    loadUserProfile();
    document.getElementById('profileForm').addEventListener('submit', updatePassword);
}); 