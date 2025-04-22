const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  path: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  subfolders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 添加刪除前的中間件，級聯刪除子文件夾
folderSchema.pre('deleteOne', { document: true }, async function(next) {
  try {
    // 刪除所有子文件夾
    const childFolders = await this.model('Folder').find({ parentFolder: this._id });
    for (const child of childFolders) {
      await child.deleteOne();
    }
    
    // 將所有屬於此文件夾的文件標記為無父文件夾
    await mongoose.model('File').updateMany(
      { parentFolder: this._id },
      { $set: { parentFolder: null } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Folder', folderSchema); 