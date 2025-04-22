const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// 身份驗證中間件
const authMiddleware = (req, res, next) => {
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

// 獲取用戶個人資料
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: '找不到用戶資料' });
        }
        res.json(user);
    } catch (error) {
      
        console.error('獲取用戶資料錯誤:', error);
        res.status(500).json({ message: '獲取用戶資料失敗' });
    }
});

// 更新用戶個人資料
router.put('/profile', auth, async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ message: '找不到用戶資料' });
        }

        // 檢查用戶名是否已被使用
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: '用戶名已被使用' });
            }
        }

        // 檢查郵箱是否已被使用
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: '郵箱已被使用' });
            }
        }

        // 更新用戶資料
        if (username) user.username = username;
        if (email) user.email = email;

        await user.save();
        res.json({ message: '個人資料更新成功', user: { 
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        }});
    } catch (error) {
        console.error('更新用戶資料錯誤:', error);
        res.status(500).json({ message: '更新用戶資料失敗' });
    }
});

// 更新密碼
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: '用戶不存在' });
    }

    // 驗證當前密碼
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: '當前密碼錯誤' });
    }

    // 更新密碼
    user.password = newPassword;
    await user.save();

    res.json({ message: '密碼更新成功' });
  } catch (error) {
    console.error('更新密碼錯誤:', error);
    res.status(500).json({ message: '更新密碼失敗', error: error.message });
  }
});

module.exports = router; 