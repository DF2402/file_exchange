// 全局變量
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let currentFile = null;

// 工具函數
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-TW');
}

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

// 文件操作函數
async function loadFileDetails() {
    const fileId = new URLSearchParams(window.location.search).get('id');
    if (!fileId) {
        showAlert('未找到文件', 'danger');
        return;
    }

    try {
        console.log('正在獲取文件詳情:', fileId);
        console.log('當前用戶:', currentUser);
        console.log('認證令牌:', token);

        const response = await fetch(`/api/files/${fileId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('服務器響應狀態:', response.status);
        const contentType = response.headers.get('content-type');
        console.log('響應內容類型:', contentType);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '獲取文件詳情失敗');
        }

        const file = await response.json();
        console.log('獲取到的文件詳情:', file);

        if (!file) {
            throw new Error('文件不存在');
        }

        currentFile = file;
        updateFileInfo(file);
        await generateQRCode(file._id);
    } catch (error) {
        console.error('加載文件詳情錯誤:', error);
        showAlert(error.message, 'danger');
    }
}

function updateFileInfo(file) {
    try {
        document.getElementById('fileName').textContent = file.originalname || '未知';
        document.getElementById('fileSize').textContent = formatFileSize(file.size || 0);
        document.getElementById('uploadTime').textContent = formatDate(file.createdAt);
        document.getElementById('uploader').textContent = file.uploadedBy?.username || '未知';
        document.getElementById('fileType').textContent = file.mimetype || '未知';
        document.getElementById('downloadCount').textContent = file.downloadCount || 0;
        document.getElementById('shareStatus').textContent = file.isPublic ? '公開' : '私有';
    } catch (error) {
        console.error('更新文件信息錯誤:', error);
        showAlert('更新文件信息失敗', 'danger');
    }
}

async function generateQRCode(fileId) {
    try {
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = ''; // 清空容器
        
        // 創建新的 canvas 元素
        const canvas = document.createElement('canvas');
        canvas.id = 'qrCanvas';
        qrContainer.appendChild(canvas);
        
        // 獲取局域網 IP 地址
        const response = await fetch('/api/system/ip');
        const { ip } = await response.json();
        
        // 使用當前協議（http 或 https）
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // 構建完整的下載 URL，使用獲取到的 IP 地址
        const baseUrl = `${protocol}//${ip}${port ? ':' + port : ''}`;
        const downloadUrl = `${baseUrl}/api/files/${fileId}/download`;
        
        console.log('生成的二維碼下載 URL:', downloadUrl);
        
        // 生成二維碼
        await QRCode.toCanvas(canvas, downloadUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        
        // 添加下載按鈕
        const downloadButton = document.createElement('button');
        downloadButton.className = 'btn btn-primary mt-2';
        downloadButton.textContent = '下載二維碼';
        downloadButton.onclick = () => downloadQRCode(fileId);
        qrContainer.appendChild(downloadButton);
    } catch (error) {
        console.error('生成二維碼失敗:', error);
        showAlert('生成二維碼失敗', 'danger');
    }
}

async function downloadQRCode(fileId) {
    try {
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) {
            throw new Error('找不到二維碼畫布');
        }
        
        // 將 canvas 轉換為 blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // 創建下載鏈接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `file-${fileId}-qr.png`;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('下載二維碼失敗:', error);
        showAlert('下載二維碼失敗', 'danger');
    }
}

function downloadFile() {
    if (!currentFile) return;
    
    const a = document.createElement('a');
    a.href = `/api/files/download/${currentFile._id}`;
    a.download = currentFile.originalname;
    a.click();
}

function shareFile() {
    if (!currentFile) return;
    
    document.getElementById('shareFileId').value = currentFile._id;
    new bootstrap.Modal(document.getElementById('shareModal')).show();
}

async function handleShare(event) {
    event.preventDefault();
    const fileId = document.getElementById('shareFileId').value;
    const username = document.getElementById('shareUsername').value;

    try {
        const response = await fetch(`/api/files/share/${fileId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        showAlert('文件共享成功');
        bootstrap.Modal.getInstance(document.getElementById('shareModal')).hide();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteFile() {
    if (!currentFile) return;
    if (!confirm('確定要刪除此文件嗎？')) return;

    try {
        const response = await fetch(`/api/files/${currentFile._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        showAlert('文件刪除成功');
        window.location.href = 'index.html';
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// UI更新函數
function updateUI() {
    const userSection = document.getElementById('userSection');
    const usernameSpan = document.getElementById('username');

    if (token && currentUser) {
        userSection.style.display = 'block';
        usernameSpan.textContent = currentUser.username;
    } else {
        window.location.href = 'index.html';
    }
}

// 事件監聽器
document.getElementById('shareForm').addEventListener('submit', handleShare);

// 初始化
updateUI();
loadFileDetails(); 