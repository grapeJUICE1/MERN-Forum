const fs = require('fs');
const path = require('path');
const Mongoose = require('mongoose');
const createError = require('http-errors');
const multer = require('multer');

const User = require('../models/User');
const Board = require('../models/Board');
const Thread = require('../models/Thread');
const Answer = require('../models/Answer');

const storage = (dest, name) => {
  return multer.diskStorage({
    destination: path.join(__dirname, '..', '..', '..', 'public', dest),
    filename: (req, file, callback) => {
      callback(null, name + '_' + Date.now() + path.extname(file.originalname))
    }
  })
}

const upload = multer({
  storage: storage('forum', 'attach'),
  limits: { fileSize: 1048576 * 24 }, // 24Mb
}).array('attach')

module.exports.getBoards = async (req, res, next) => { 
  try {
    const { limit = 10, page = 1, sort, pagination = true } = req.query

    let boards
    if (sort === 'popular') {
      boards = await Board.paginate({}, { sort: { threadsCount: -1 }, page, limit, pagination: !!pagination })
    } else if (sort === 'answersCount') {
      boards = await Board.paginate({}, { sort: { answersCount: -1 }, page, limit, pagination: !!pagination })
    } else if (sort === 'newestThread') {
      boards = await Board.paginate({}, { sort: { newestThread: -1 }, page, limit, pagination: !!pagination })
    } else if (sort === 'newestAnswer') {
      boards = await Board.paginate({}, { sort: { newestAnswer: -1 }, page, limit, pagination: !!pagination })
    } else {
      boards = await Board.paginate({}, { sort: { position: -1 }, page, limit, pagination: !!pagination })
    }

    res.json(boards)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.getBoard = async (req, res, next) => { 
  try {
    const { name, boardId } = req.query

    let board
    if (name) {
      board = await Board.findOne({ name })
    } else if (boardId) {
      board = await Board.findById(boardId)
    } else {
      return next(createError.BadRequest('Board name or boardId must not be empty'))
    }

    res.json(board)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.createBoard = async (req, res, next) => { 
  try {
    const { name, title, body, position } = req.body
    const admin = req.payload.role === 'admin'

    if (!admin) return next(createError.Unauthorized('Action not allowed'))
    if (name.trim() === '') return next(createError.BadRequest('Board name must not be empty'))
    if (title.trim() === '') return next(createError.BadRequest('Board title must not be empty'))
    if (!position || !Number.isInteger(position) || position < 0) return next(createError.BadRequest('Position must be number'))

    const newBoard = new Board({
      name,
      title,
      body,
      position,
      createdAt: new Date().toISOString(),
      threadsCount: 0,
      answersCount: 0
    })

    const board = await newBoard.save()

    res.json(board)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.deleteBoard = async (req, res, next) => { 
  try {
    const { boardId } = req.body
    const admin = req.payload.role === 'admin'

    if (!admin) return next(createError.Unauthorized('Action not allowed'))
    if (!boardId) return next(createError.BadRequest('boardId must not be empty'))

    const board = await Board.findById(boardId)
    await board.delete()

    res.json({ message: 'Board successfully deleted' })
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.editBoard = async (req, res, next) => { 
  try {
    const { boardId, name, title, body, position } = req.body
    const admin = req.payload.role === 'admin'

    if (!admin) return next(createError.Unauthorized('Action not allowed'))
    if (name.trim() === '') return next(createError.BadRequest('Board name must not be empty'))
    if (title.trim() === '') return next(createError.BadRequest('Board title must not be empty'))
    if (!position || !Number.isInteger(position) || position < 0) return next(createError.BadRequest('Position must be number'))

    await Board.updateOne({ _id: Mongoose.Types.ObjectId(boardId) }, { name, title, body, position })
    const board = await Board.findById(boardId)

    res.json(board)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.getRecentlyThreads = async (req, res, next) => { 
  try {
    const { limit = 10, page = 1 } = req.query

    const populate = [{
      path: 'author',
      select: '_id name displayName onlineAt picture role'
    }, {
      path: 'likes',
      select: '_id name displayName picture'
    }]
    const threads = await Thread.paginate({}, { sort: { pined: -1, createdAt: -1 }, page, limit, populate })

    res.json(threads)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.getThreads = async (req, res, next) => { 
  try {
    const { boardId, limit = 10, page = 1, sort } = req.query

    if (!boardId) return next(createError.BadRequest('boardId must not be empty'))

    const populate = [{
      path: 'author',
      select: '_id name displayName onlineAt picture role'
    }, {
      path: 'likes',
      select: '_id name displayName picture'
    }]
    let threads
    if (sort === 'answersCount') {
      threads = await Thread.paginate({ boardId }, { sort: { pined: -1, answersCount: -1 }, page, limit, populate })
    } else if (sort === 'newestAnswer') {
      threads = await Thread.paginate({ boardId }, { sort: { pined: -1, newestAnswer: -1 }, page, limit, populate })
    } else {
      threads = await Thread.paginate({ boardId }, { sort: { pined: -1, createdAt: -1 }, page, limit, populate })
    }

    res.json(threads)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.getThread = async (req, res, next) => { 
  try {
    const { threadId } = req.query

    if (!threadId) return next(createError.BadRequest('threadId must not be empty'))

    const populate = [{
      path: 'author',
      select: '_id name displayName onlineAt picture role'
    }, {
      path: 'likes',
      select: '_id name displayName picture'
    }]
    const thread = await Thread.findById(threadId).populate(populate)
    const board = await Board.findById(thread.boardId).select('_id name title')

    res.json({ board, thread })
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.createThread = async (req, res, next) => { 
  try {
    const { boardId, title, body } = req.body

    if (!boardId) return next(createError.BadRequest('boardId must not be empty'))
    if (title.trim() === '') return next(createError.BadRequest('Thread title must not be empty'))
    if (body.trim() === '') return next(createError.BadRequest('Thread body must not be empty'))

    const now = new Date().toISOString()

    const newThread = new Thread({
      boardId,
      pined: false,
      closed: false,
      title: title.substring(0, 100),
      body: body.substring(0, 1000),
      createdAt: now,
      author: req.payload.id,
      newestAnswer: now
    })

    const thread = await newThread.save()

    await Board.updateOne({ _id: Mongoose.Types.ObjectId(boardId) }, { $inc: { threadsCount: 1 }, newestThread: now })

    res.json(thread)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.deleteThread = async (req, res, next) => { 
  try {
    const { threadId } = req.body
    const admin = req.payload.role === 'admin'

    if (!admin) return next(createError.Unauthorized('Action not allowed'))
    if (!threadId) return next(createError.BadRequest('threadId must not be empty'))

    const thread = await Thread.findById(threadId)
    await thread.delete()

    await Answer.deleteMany({ threadId })
    await Board.updateOne({ _id: Mongoose.Types.ObjectId(thread.boardId) }, { $inc: { threadsCount: -1 } })

    res.json({ message: 'Thread successfully deleted' })
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.editThread = async (req, res, next) => { 
  try {
    const { threadId, title, body, closed } = req.body

    if (title.trim() === '') return next(createError.BadRequest('Board title must not be empty'))
    if (body.trim() === '') return next(createError.BadRequest('Thread body must not be empty'))

    const thread = await Thread.findById(threadId)

    if (req.payload.id !== thread.author.toString()) return next(createError.Unauthorized('Action not allowed'))

    await Thread.updateOne({ _id: Mongoose.Types.ObjectId(threadId) }, {
      title: title.substring(0, 100),
      body: body.substring(0, 1000),
      closed: closed === undefined ? thread.closed : closed,
      edited: {
        createdAt: new Date().toISOString()
      }
    })

    const populate = [{
      path: 'author',
      select: '_id name displayName onlineAt picture role'
    }, {
      path: 'likes',
      select: '_id name displayName picture'
    }]
    const editedThread = await Thread.findById(threadId).populate(populate)

    res.json(editedThread)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.adminEditThread = async (req, res, next) => { 
  try {
    const { threadId, title, body, pined, closed } = req.body
    const admin = req.payload.role === 'admin'

    if (!admin) return next(createError.Unauthorized('Action not allowed'))
    if (title.trim() === '') return next(createError.BadRequest('Board title must not be empty'))
    if (body.trim() === '') return next(createError.BadRequest('Thread body must not be empty'))

    const thread = await Thread.findById(threadId)

    await Thread.updateOne({ _id: Mongoose.Types.ObjectId(threadId) }, {
      title: title.substring(0, 100),
      body: body.substring(0, 1000),
      pined: pined === undefined ? thread.pined : pined,
      closed: closed === undefined ? thread.closed : closed,
      edited: {
        createdAt: new Date().toISOString()
      }
    })

    const populate = [{
      path: 'author',
      select: '_id name displayName onlineAt picture role'
    }, {
      path: 'likes',
      select: '_id name displayName picture'
    }]
    const editedThread = await Thread.findById(threadId).populate(populate)

    res.json(editedThread)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.likeThread = async (req, res, next) => { 
  try {
    const { threadId } = req.body

    if (!threadId) return next(createError.BadRequest('threadId must not be empty'))

    const populate = {
      path: 'likes',
      select: '_id name displayName picture'
    }
    const thread = await Thread.findById(threadId).populate('likes')

    if (thread.likes.find(like => like._id === req.payload.id)) {
      thread.likes = thread.likes.filter(like => like._id !== req.payload.id)
    } else {
      thread.likes.push({
        likes: [req.payload.id]
      })
    }
    await thread.save()

    res.json(thread)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}

module.exports.getAnswers = async (req, res, next) => { 
  try {
    const { threadId, limit = 10, page = 1, pagination = true } = req.query

    if (!threadId) return next(createError.BadRequest('threadId must not be empty'))

    const answers = await Answer.paginate({ threadId }, { page, limit, pagination: !!pagination })

    res.json(answers)
  } catch(err) {
    next(createError.InternalServerError(err))
  }
}