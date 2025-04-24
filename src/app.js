const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config();
const User = require('./models/User');
const authMiddleware = require('./middleware/auth');

const app = express();

// 中间件配置
app.use(cors({
    origin: '*',  // 允許所有來源訪問
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API 路由配置
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

// 健康檢查端點
app.get('/api/health', (req, res) => {
  console.log('健康檢查端點被訪問');
  try {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
    console.log('健康檢查響應已發送');
  } catch (error) {
    console.error('健康檢查錯誤:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 静态文件路由配置
app.use(express.static(path.join(__dirname, '../public')));

// 获取局域网 IP 地址
app.get('/api/system/ip', (req, res) => {
    // 優先使用環境變量中的 HOST_IP
    const hostIp = process.env.HOST_IP;
    
    if (hostIp) {
      return res.json({ ip: hostIp });
    }
    
    // 如果環境變量中沒有設置，則自動檢測系統 IP
    try {
        const networkInterfaces = os.networkInterfaces();
        let ipAddress = null;
        
        // 遍歷所有網絡接口
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            
            // 遍歷接口的所有地址
            for (const interface of interfaces) {
                // 只考慮 IPv4 地址，且排除回環地址
                if (interface.family === 'IPv4' && !interface.internal) {
                    ipAddress = interface.address;
                    break;
                }
            }
            
            // 如果找到了非回環的 IPv4 地址，則跳出循環
            if (ipAddress) {
                break;
            }
        }
        
        // 如果沒有找到合適的 IP 地址，則使用請求的 IP
        if (!ipAddress) {
            ipAddress = req.ip || req.connection.remoteAddress;
        }
        
        res.json({ ip: ipAddress });
    } catch (error) {
        console.error('獲取 IP 地址時發生錯誤:', error);
        // 如果出錯，使用請求的 IP
        const fallbackIp = req.ip || req.connection.remoteAddress;
        res.json({ ip: fallbackIp });
    }
});

// 处理 folder.html 路由
app.get('/folder', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/folder.html'));
});

// 創建初始管理員用戶
async function createInitialAdmin() {
  try {
    console.log('開始檢查管理員用戶...');
    const adminExists = await User.findOne({ username: 'admin' });
    console.log('管理員用戶檢查結果:', adminExists ? '已存在' : '不存在');
    
    if (!adminExists) {
      console.log('開始創建管理員用戶...');
      const admin = new User({
        username: 'admin',
        password: 'admin123456',
        role: 'admin',
        status: 'active'
      });
      await admin.save();
      console.log('管理員用戶創建成功');
    }
  } catch (error) {
    console.error('創建管理員用戶時發生錯誤:', error);
  }
}

// 在數據庫連接成功後創建初始管理員
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/filedb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
}).then(async () => {
  console.log('MongoDB連接成功');
  try {
    await createInitialAdmin();
  } catch (error) {
    console.error('初始化管理員用戶時發生錯誤:', error);
  }
}).catch((err) => {
  console.error('MongoDB連接失敗:', err);
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

const PORT = process.env.PORT || 3500;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服務器運行在端口 ${PORT}，監聽所有網絡接口`);
});