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
    origin: ['http://localhost:3500', 'http://127.0.0.1:3500'],
    credentials: true
}));
app.use(express.json());

// API 路由配置
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
// 静态文件路由配置
app.use(express.static(path.join(__dirname, '../public')));

// 获取局域网 IP 地址
app.get('/api/system/ip', (req, res) => {
    const interfaces = os.networkInterfaces();
    let ip = 'localhost';
    
    // 遍历网络接口
    for (const interfaceName in interfaces) {
        const interface = interfaces[interfaceName];
        for (const addr of interface) {
            // 只获取 IPv4 地址
            if (addr.family === 'IPv4' && !addr.internal) {
                ip = addr.address;
                break;
            }
        }
        if (ip !== 'localhost') break;
    }
    
    res.json({ ip });
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
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});