const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const File = require('../models/File');
const Folder = require('../models/Folder');

// 配置 GridFS 存儲
const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return {
            bucketName: 'uploads',
            filename: `${Date.now()}-${file.originalname}`
        };
    }
});

const upload = multer({ storage });

// 獲取文件列表
router.get('/list', auth, async (req, res) => {
    try {
        let query = { parentFolder: null }; // 只獲取不在文件夾中的文件
        
        if (req.user.role !== 'admin') {
            query = {
                ...query,
                $or: [
                    { uploadedBy: req.user._id },
                    { sharedWith: req.user._id },
                    { isPublic: true }
                ]
            };
        }

        const files = await File.find(query)
            .populate('uploadedBy', 'username')
            .sort({ createdAt: -1 });
            
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 上傳文件
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '請選擇要上傳的文件' });
        }

        const file = new File({
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user._id,
            gridFSId: req.file.id,
            parentFolder: req.body.parentFolder || null
        });

        await file.save();

        // 如果指定了父文件夾，更新文件夾的文件列表
        if (req.body.parentFolder) {
            await Folder.findByIdAndUpdate(
                req.body.parentFolder,
                { $push: { files: file._id } }
            );
        }

        res.status(201).json(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 獲取文件詳情
router.get('/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        // 檢查權限
        if (!file.isPublic && 
            file.uploadedBy.toString() !== req.user._id.toString() && 
            !file.sharedWith.includes(req.user._id) &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ message: '沒有權限訪問此文件' });
        }

        res.json(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 共享文件
router.post('/:id/share', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (file.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '只有文件上傳者可以共享文件' });
        }

        file.sharedWith = [...new Set([...file.sharedWith, ...req.body.userIds])];
        await file.save();

        res.json(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 刪除文件
router.delete('/:id', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (file.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: '只有文件上傳者或管理員可以刪除文件' });
        }

        // 從 GridFS 刪除文件
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
        await bucket.delete(new mongoose.Types.ObjectId(file.gridFSId));

        // 從父文件夾中移除文件引用
        if (file.parentFolder) {
            await Folder.findByIdAndUpdate(
                file.parentFolder,
                { $pull: { files: file._id } }
            );
        }

        await file.deleteOne();
        res.json({ message: '文件已刪除' });
    } catch (error) {
        console.error('刪除文件錯誤:', error);
        res.status(500).json({ message: error.message });
    }
});

// 移動文件到文件夾
router.put('/:id/move', auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        if (file.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '只有文件上傳者可以移動文件' });
        }

        // 檢查目標文件夾是否存在
        if (req.body.folderId) {
            const targetFolder = await Folder.findById(req.body.folderId);
            if (!targetFolder) {
                return res.status(404).json({ message: '目標文件夾不存在' });
            }
            
            // 檢查用戶是否有權限訪問目標文件夾
            if (targetFolder.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ message: '沒有權限訪問目標文件夾' });
            }
        }

        const oldParentFolder = file.parentFolder;
        file.parentFolder = req.body.folderId;
        await file.save();

        // 更新舊文件夾的文件列表
        if (oldParentFolder) {
            await Folder.findByIdAndUpdate(
                oldParentFolder,
                { $pull: { files: file._id } }
            );
        }

        // 更新新文件夾的文件列表
        if (req.body.folderId) {
            await Folder.findByIdAndUpdate(
                req.body.folderId,
                { $push: { files: file._id } }
            );
        }

        res.json(file);
    } catch (error) {
        console.error('移動文件錯誤:', error);
        res.status(500).json({ message: error.message });
    }
});

// 下載文件
router.get('/:id/download', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: '文件不存在' });
        }

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });

        res.set('Content-Type', file.mimetype);
        res.set('Content-Disposition', `attachment; filename="${file.originalname}"`);

        const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(file.gridFSId));
        downloadStream.pipe(res);
    } catch (error) {
        console.error('下載文件錯誤:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 