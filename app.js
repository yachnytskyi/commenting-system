const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp'); // For image resizing
const sanitizeHtml = require('sanitize-html');
const xss = require('xss');
const multer = require('multer'); // For file uploads

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database('comments.db');

// Create a table for comments
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY,
      userName TEXT NOT NULL,
      email TEXT NOT NULL,
      homePage TEXT,
      text TEXT NOT NULL,
      parentCommentId INTEGER,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// CAPTCHA code for the test task
const fakeCaptchaCode = 'testCaptcha123';

// Define allowed image formats and maximum dimensions
const allowedImageFormats = ['image/jpeg', 'image/gif', 'image/png'];
const maxWidth = 320;
const maxHeight = 240;

// Define allowed text file format and maximum size
const allowedTextFileFormat = ['text/plain'];
const maxTextFileSize = 100 * 1024; // 100KB

// Define allowed HTML tags and attributes
const allowedHtmlTags = {
  a: ['href', 'title'],
  code: [],
  i: [],
  strong: [],
};
const allowedHtmlTagRegex = /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/g;

// Define the storage engine for file uploads
const storage = multer.diskStorage({
  destination: './uploads',
  filename: function (req, file, cb) {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

// Initialize the file upload middleware
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (allowedImageFormats.includes(file.mimetype)) {
      cb(null, true);
    } else if (allowedTextFileFormat.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format'));
    }
  },
  limits: { fileSize: maxTextFileSize }, // Limit text file size to 100KB
});

// Recursive function to fetch child comments
function getCommentsWithChildren(commentId, callback) {
  db.all('SELECT * FROM comments WHERE parentCommentId = ?', [commentId], (err, rows) => {
    if (err) {
      return callback(err, null);
    }
    if (rows.length === 0) {
      return callback(null, []);
    }
    const commentsWithChildren = [];
    let pending = rows.length;
    rows.forEach((row) => {
      getCommentsWithChildren(row.id, (err, children) => {
        if (err) {
          return callback(err, null);
        }
        row.children = children;
        commentsWithChildren.push(row);
        if (--pending <= 0) {
          callback(null, commentsWithChildren);
        }
      });
    });
  });
}

// API endpoint to add a comment with a faked CAPTCHA and file upload
app.post('/comments', upload.single('file'), (req, res) => {
  const { userName, email, homePage, text, parentCommentId, captcha } = req.body;

  // Verify the faked CAPTCHA code
  if (captcha !== fakeCaptchaCode) {
    return res.status(400).json({ error: 'CAPTCHA verification failed' });
  }

  // Sanitize and prevent XSS attacks in text
  const sanitizedText = sanitizeHtml(text);

  // Check if a text file was uploaded
  if (req.file) {
    if (req.file.size > maxTextFileSize) {
      // File size exceeds the limit
      return res.status(400).json({ error: 'Text file size exceeds the limit' });
    }
  }

  // Check if an image file was uploaded
  if (req.file) {
    const imagePath = req.file.path;

    // Resize the image to a maximum of 320x240 pixels
    sharp(imagePath)
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside' })
      .toFile(imagePath, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Image resizing failed' });
        }
      });
  }

  // Validate and sanitize the HTML content
  let sanitizedHtml = sanitizedText;

  // Use regular expressions to check for valid XHTML tags
  const matchHtmlTags = sanitizedText.match(allowedHtmlTagRegex);
  if (matchHtmlTags) {
    matchHtmlTags.forEach((htmlTag) => {
      if (!htmlTag.match(allowedHtmlTagRegex)) {
        // Remove invalid HTML tags
        sanitizedHtml = sanitizedHtml.replace(htmlTag, '');
      }
    });
  }

  // Insert the comment into the SQLite database
  const stmt = db.prepare(`
    INSERT INTO comments (userName, email, homePage, text, parentCommentId) 
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(xss(userName), xss(email), xss(homePage), sanitizedHtml, parentCommentId, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.send('Comment added successfully');
  });

  stmt.finalize();
});

// API endpoint to get top-level comments in table format with sorting
app.get('/top-level-comments', (req, res) => {
  const { sortBy = 'date', sortOrder = 'desc' } = req.query;

  const allowedSortByFields = ['userName', 'email', 'date'];
  const allowedSortOrders = ['asc', 'desc'];

  if (!allowedSortByFields.includes(sortBy) || !allowedSortOrders.includes(sortOrder)) {
    return res.status(400).json({ error: 'Invalid sort parameters' });
  }

  const sql = `SELECT * FROM comments WHERE parentCommentId IS NULL ORDER BY ${sortBy} ${sortOrder}`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// API endpoint to get a comment and its child comments
app.get('/comments/:commentId', (req, res) => {
  const { commentId } = req.params;

  // Retrieve the comment with the specified ID
  db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Use the recursive function to fetch child comments
    getCommentsWithChildren(commentId, (err, commentsWithChildren) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Attach the child comments to the parent comment
      comment.children = commentsWithChildren;

      res.json(comment);
    });
  });
});

// Set up a static file server for uploaded images
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
