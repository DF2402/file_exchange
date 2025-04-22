const express = require('express');
const router = express.Router();
const User = require('../models/User');
const File = require('../models/File');
const Folder = require('../models/Folder');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const os = require('os');
// 身份驗證中間件
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('認證錯誤:', error);
        res.status(401).json({ message: '請先登入' });
    }
};

// 管理員權限中間件
const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: '需要管理員權限' });
        }
        next();
    } catch (error) {
        console.error('管理員權限檢查錯誤:', error);
        res.status(500).json({ message: '權限檢查失敗' });
    }
};

// 清空所有數據
router.delete('/clear-all', auth, adminAuth, async (req, res) => {
    try {
        // 清空文件集合
        await File.deleteMany({});
        console.log('文件集合清空');
        // 清空文件夾集合
        await Folder.deleteMany({});
        console.log('文件夾集合清空');
        res.json({ message: '所有數據已清空' });
  
    } catch (error) {
        console.error('清空數據失敗:', error);
        res.status(500).json({ message: '清空數據失敗', error: error.message });
    }
});
//  獲取CPU使用率
const getCpuUsage = () => {
    return new Promise((resolve) => {
        const start = process.cpuUsage();
        const startTime = Date.now();
        
        setTimeout(() => {
            const diff = process.cpuUsage(start);
            const elapsedTime = Date.now() - startTime;
            const cpuPercentage = (diff.user + diff.system) / (elapsedTime * 1000) * 100;
            resolve(cpuPercentage);
        }, 100);
    });
};
// 獲取記憶體使用率
const getMemoryUsage = () => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;
    return memoryPercentage;
};

// 獲取系統統計數據
router.get('/stats', auth, adminAuth, async (req, res) => {
    const cpuUsage = await getCpuUsage();
    const memoryUsage = getMemoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const recentActivities = await File.find().sort({ timestamp: -1 }).limit(5);
    console.log(recentActivities);
    try {
        const stats = {
            recentActivities:recentActivities,
            systemStatus: {
                
                cpuUsage: cpuUsage.toFixed(2),
                memoryUsage: memoryUsage.toFixed(2),
                totalMemory:totalMemory,
                freeMemory:freeMemory
            },
            totalUsers: await User.countDocuments(),
            totalFiles: await File.countDocuments(),
            totalFolders: await Folder.countDocuments(),
            totalStorage: await File.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$size' }
                    }
                }
            ]).then(result => result[0]?.total || 0)
        };
        
        res.json(stats);
    } catch (error) {
        console.error('獲取統計數據失敗:', error);
        res.status(500).json({ message: '獲取統計數據失敗', error: error.message });
    }
});

// 獲取用戶名
router.get('user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id, 'username');
        if (!user) {
            return res.status(404).json({ message: '用戶未找到' });
        }
        res.json({ username: user.username });
    } catch (error) {
        res.status(500).json({ message: '獲取失敗', error });
    }
});

// 獲取最近註冊用戶
router.get('/users/recent', auth, adminAuth, async (req, res) => {
    try {
        const recentUsers = await User.find({}, '-password')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        
        res.json(recentUsers);
    } catch (error) {
        console.error('獲取最近用戶失敗:', error);
        res.status(500).json({ message: '獲取最近用戶失敗', error: error.message });
    }
});

// 獲取最近上傳文件
router.get('/files/recent', auth, adminAuth, async (req, res) => {
    try {
        const recentFiles = await File.find({ isFolder: false })
            .populate('uploadedBy', 'username')
            .sort({ uploadDate: -1 })
            .limit(5)
            .lean();
        
        res.json(recentFiles);
    } catch (error) {
        console.error('獲取最近文件失敗:', error);
        res.status(500).json({ message: '獲取最近文件失敗', error: error.message });
    }
});

// 獲取所有用戶列表
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({}, '-password').lean();
        res.json(users);
    } catch (error) {
        console.error('獲取用戶列表失敗:', error);
        res.status(500).json({ message: '獲取用戶列表失敗', error: error.message });
    }
});

// 更新用戶狀態（啟用/禁用）
router.patch('/users/:userId/status', auth, adminAuth, async (req, res) => {
    console.log(req.params);
    console.log(req.body);
    try {
        const { userId } = req.params;
        const { status } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }

        user.status = status;
        if (!user.status) {
            user.status = 'active';
        }
        await user.save();

        res.json({ message: '用戶狀態更新成功', user });
    } catch (error) {
        console.error('更新用戶狀態失敗:', error);
        res.status(500).json({ message: '更新用戶狀態失敗', error: error.message });
    }
});

// 刪除用戶
router.delete('/users/:userId', auth, adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }

        // 不允許刪除管理員用戶
        if (user.role === 'admin') {
            return res.status(403).json({ message: '不能刪除管理員用戶' });
        }

        await user.deleteOne();
        res.json({ message: '用戶刪除成功' });
    } catch (error) {
        console.error('刪除用戶失敗:', error);
        res.status(500).json({ message: '刪除用戶失敗', error: error.message });
    }
});

// 獲取單個用戶信息
router.get('/user/:userId', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: '用戶不存在' });
        }
        res.json({ username: user.username });
    } catch (error) {
        console.error('獲取用戶信息失敗:', error);
        res.status(500).json({ message: '獲取用戶信息失敗', error: error.message });
    }
});

module.exports = router;