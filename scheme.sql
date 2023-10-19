-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

-- Create the comments table
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  text TEXT NOT NULL,
  parent_comment_id INTEGER,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
);

-- Create a table for storing CAPTCHA codes
CREATE TABLE IF NOT EXISTS captcha (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL
);

-- Index on user_id for comments
CREATE INDEX IF NOT EXISTS idx_user_id ON comments (user_id);

-- Index on parent_comment_id for comments
CREATE INDEX IF NOT EXISTS idx_parent_comment_id ON comments (parent_comment_id);
