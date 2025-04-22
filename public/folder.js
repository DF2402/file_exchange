let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let currentFolder = null;

// 頁面加載時初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 檢查登入狀態
        if (!token || !currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // 更新界面
        updateUI(currentUser);

        // 獲取文件夾 ID
        const urlParams = new URLSearchParams(window.location.search);
        const folderId = urlParams.get('id');
        
        if (!folderId) {
            window.location.href = 'index.html';
            return;
        }

        // 加載文件夾詳情
        await loadFolderDetails(folderId);

        // 綁定上傳按鈕事件
        const uploadFolderBtn = document.getElementById('uploadFolderBtn');
        if (uploadFolderBtn) {
            uploadFolderBtn.addEventListener('click', () => {
                document.getElementById('folderInput').click();
            });
        }

        // 綁定文件夾輸入事件
        const folderInput = document.getElementById('folderInput');
        if (folderInput) {
            folderInput.addEventListener('change', handleFolderUpload);
        }
    } catch (error) {
        console.error('初始化錯誤:', error);
        alert('初始化失敗: ' + error.message);
    }
});

// 更新界面
function updateUI(currentUser) {
    const userSection = document.getElementById('userSection');
    const usernameSpan = document.getElementById('username');
    
    if (userSection) userSection.style.display = 'block';
    if (usernameSpan) usernameSpan.textContent = currentUser.username;
}

// 加載文件夾詳情
async function loadFolderDetails(folderId) {
    try {
        const response = await fetch(`/api/folders/${folderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('無法獲取文件夾詳情');
        }

        const folder = await response.json();
        currentFolder = folder;

        // 更新基本信息
        document.getElementById('folderName').textContent = folder.name;
        document.getElementById('folderCreator').textContent = folder.createdBy.username;
        document.getElementById('folderCreatedAt').textContent = new Date(folder.createdAt).toLocaleString();
        document.getElementById('folderUpdatedAt').textContent = new Date(folder.updatedAt).toLocaleString();
        document.getElementById('folderAccess').textContent = folder.isPublic ? '公開' : '私有';

        // 更新共享用戶列表
        updateSharedUsers(folder.sharedWith);

        // 加載文件夾內容
        await loadFolderContent(folderId);
    } catch (error) {
        console.error('加載文件夾詳情錯誤:', error);
        alert('加載文件夾詳情失敗: ' + error.message);
    }
}

// 更新共享用戶列表
function updateSharedUsers(sharedUsers) {
    const sharedUsersList = document.getElementById('sharedUsers');
    sharedUsersList.innerHTML = sharedUsers.map(user => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <i class="bi bi-person me-2"></i>
                ${user.username}
                <small class="text-muted">(${user.email})</small>
            </div>
            <button class="btn btn-sm btn-danger" onclick="removeSharedUser('${user._id}')">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `).join('');
}

// 加載文件夾內容
async function loadFolderContent(folderId) {
    try {
        const response = await fetch(`/api/folders/${folderId}/contents`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('無法獲取文件夾內容');
        }

        const data = await response.json();
        const folderContent = document.getElementById('folderContent');

        // 顯示子文件夾
        if (data.folders && data.folders.length > 0) {
            data.folders.forEach(folder => {
                const folderElement = createFolderElement(folder);
                folderContent.appendChild(folderElement);
            });
        }

        // 顯示文件
        if (data.files && data.files.length > 0) {
            data.files.forEach(file => {
                const fileElement = createFileElement(file);
                folderContent.appendChild(fileElement);
            });
        }

        // 如果沒有內容
        if ((!data.folders || data.folders.length === 0) && 
            (!data.files || data.files.length === 0)) {
            folderContent.innerHTML = '<div class="text-center text-muted py-4">此文件夾為空</div>';
        }
    } catch (error) {
        console.error('加載文件夾內容錯誤:', error);
        alert('加載文件夾內容失敗: ' + error.message);
    }
}

// 創建文件夾元素
function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="bi bi-folder-fill text-warning me-2"></i>
                <a href="folder.html?id=${folder._id}" class="text-decoration-none">
                    ${folder.name}
                </a>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFolder('${folder._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    return div;
}

// 創建文件元素
function createFileElement(file) {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="bi bi-file-earmark-text text-primary me-2"></i>
                <span>${file.originalname}</span>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="downloadFile('${file._id}')">
                    <i class="bi bi-download"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFile('${file._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    return div;
}

// 添加共享用戶
async function addSharedUser() {
    try {
        const newSharedUser = document.getElementById('newSharedUser').value.trim();
        if (!newSharedUser) {
            alert('請輸入用戶名或電子郵件');
            return;
        }

        const response = await fetch(`/api/folders/${currentFolder._id}/share`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userIdentifier: newSharedUser
            })
        });

        if (!response.ok) {
            throw new Error('無法添加共享用戶');
        }

        const updatedFolder = await response.json();
        updateSharedUsers(updatedFolder.sharedWith);
        document.getElementById('newSharedUser').value = '';
    } catch (error) {
        console.error('添加共享用戶錯誤:', error);
        alert('添加共享用戶失敗: ' + error.message);
    }
}

// 移除共享用戶
async function removeSharedUser(userId) {
    try {
        if (!confirm('確定要移除此共享用戶嗎？')) {
            return;
        }

        const response = await fetch(`/api/folders/${currentFolder._id}/share/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('無法移除共享用戶');
        }

        const updatedFolder = await response.json();
        updateSharedUsers(updatedFolder.sharedWith);
    } catch (error) {
        console.error('移除共享用戶錯誤:', error);
        alert('移除共享用戶失敗: ' + error.message);
    }
}

// 下載文件
async function downloadFile(fileId) {
    try {
        const response = await fetch(`/api/files/${fileId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('無法下載文件');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('下載文件錯誤:', error);
        alert('下載文件失敗: ' + error.message);
    }
}

// 刪除文件
async function deleteFile(fileId) {
    try {
        if (!confirm('確定要刪除此文件嗎？')) {
            return;
        }

        const response = await fetch(`/api/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('無法刪除文件');
        }

        await loadFolderContent(currentFolder._id);
    } catch (error) {
        console.error('刪除文件錯誤:', error);
        alert('刪除文件失敗: ' + error.message);
    }
}

// 刪除文件夾
async function deleteFolder(folderId) {
    try {
        if (!confirm('確定要刪除此文件夾嗎？這將同時刪除文件夾中的所有內容。')) {
            return;
        }

        const response = await fetch(`/api/folders/${folderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('無法刪除文件夾');
        }

        window.location.href = 'index.html';
    } catch (error) {
        console.error('刪除文件夾錯誤:', error);
        alert('刪除文件夾失敗: ' + error.message);
    }
}

// 登出
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 文件夾相關功能
let currentFolderId = null;

async function handleFolderUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    const formData = new FormData();
    const subFolders = new Set();
    
    // 設置為文件夾上傳
    formData.append('isRootFolder', 'true');
    formData.append('folderName', files[0].webkitRelativePath.split('/')[0]);

    // 收集所有子文件夾路徑
    for (const file of files) {
        const pathParts = file.webkitRelativePath.split('/');
        pathParts.pop(); // 移除文件名
        if (pathParts.length > 1) { // 如果不是根目錄
            subFolders.add(pathParts.join('/'));
        }
        formData.append('files', file);
    }

    // 添加子文件夾信息
    formData.append('subFolders', JSON.stringify(Array.from(subFolders)));

    try {
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('上傳失敗');
        }

        const result = await response.json();
        showSuccess('文件夾上傳成功');
        if (currentFolderId) {
            await loadFolderContent();
        }
    } catch (error) {
        console.error('上傳錯誤:', error);
        showError('文件夾上傳失敗');
    }
}

function showError(message) {
    // 顯示錯誤消息
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
    setTimeout(() => errorDiv.remove(), 3000);
}

function showSuccess(message) {
    // 顯示成功消息
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    document.body.insertBefore(successDiv, document.body.firstChild);
    setTimeout(() => successDiv.remove(), 3000);
} 