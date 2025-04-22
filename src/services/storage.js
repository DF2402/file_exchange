const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');

// 確保上傳目錄存在
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = {
    // 保存文件
    saveFile: async (file, filePath) => {
        const fullPath = path.join(uploadDir, filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        return new Promise((resolve, reject) => {
            fs.writeFile(fullPath, file.buffer, (err) => {
                if (err) reject(err);
                else resolve(fullPath);
            });
        });
    },

    // 讀取文件
    getFile: async (filePath) => {
        const fullPath = path.join(uploadDir, filePath);
        return new Promise((resolve, reject) => {
            fs.readFile(fullPath, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    },

    // 刪除文件
    deleteFile: async (filePath) => {
        const fullPath = path.join(uploadDir, filePath);
        return new Promise((resolve, reject) => {
            fs.unlink(fullPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    // 創建可讀流
    createReadStream: (filePath) => {
        const fullPath = path.join(uploadDir, filePath);
        return fs.createReadStream(fullPath);
    },

    // 創建可寫流
    createWriteStream: (filePath) => {
        const fullPath = path.join(uploadDir, filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        return fs.createWriteStream(fullPath);
    }
};

module.exports = storage; 