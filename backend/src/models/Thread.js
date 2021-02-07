const { model, Schema } = require('mongoose');

const threadSchema = new Schema({
  boardId: String,
  pined: Boolean,
  closed: Boolean,
  title: String,
  body: String,
  createdAt: String,
  author: [{
    id: Schema.Types.ObjectId,
    username: String
  }],
  edited: [{
    createdAt: String
  }],
  likes: [{
    username: String,
    createdAt: String
  }],
  attach: [{
    file: String,
    type: String
  }]
})

module.exports = model('Thread', threadSchema);