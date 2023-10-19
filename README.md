# Commenting System - Dockerized Node.js Application

This project is a simple commenting system implemented as a Node.js application, designed for users to leave comments. It includes the ability to add comments, display comments in a cascading format, sort comments, and protect against common web security threats like XSS and SQL injection.

## Features

- Users can add comments with the following information:
  - User Name
  - Email
  - Home Page (optional)
  - Comment Text (supporting limited HTML tags)
- Captcha verification to prevent spam
- Comments are stored in a relational database (SQLite in this example)
- Top-level comments are displayed in a table with sorting options
- Comment pagination (25 comments per page)
- Protection against XSS attacks and SQL injection
- Sort comments by LIFO (Last In, First Out)

### Additional Features (Added Later)

- Users can upload image files (JPG, GIF, PNG) and text files (TXT)
- Image files are resized to 320x240 pixels to ensure consistency
- Text file size is limited to 100KB
- Enhanced HTML tag validation to ensure XHTML compliance

## Usage

Clone this repository to your local machine.

git clone https://github.com/yourusername/commenting-system.git
cd commenting-system


Install the required dependencies
npm install

Build and run the Docker container.
docker build -t my-comment-app .
docker run -d -p 3000:3000 --name my-comment-container my-comment-app

Access the application in your browser at http://localhost:3000.

API Endpoints

The commenting system provides the following API endpoints for interaction:

POST /comments: Add a new comment.
Required parameters:
userName: User's name (alphanumeric characters).
email: User's email (email format).
homePage (optional): User's home page (URL format).
text: Comment text (limited HTML tags allowed).
captcha: CAPTCHA code for verification.
Example usage:

curl -X POST -H "Content-Type: application/json" -d '{
  "userName": "John Doe",
  "email": "john@example.com",
  "homePage": "https://example.com",
  "text": "This is my comment.",
  "captcha": "testCaptcha123"
}' http://localhost:3000/comments

GET /top-level-comments: Get top-level comments in table format with sorting.
Optional query parameters:
sortBy (default: "date"): Field to sort by ("userName", "email", "date").
sortOrder (default: "desc"): Sort order ("asc" or "desc").
Example usage:
Retrieve top-level comments sorted by user name in ascending order:
curl http://localhost:3000/top-level-comments?sortBy=userName&sortOrder=asc

GET /comments/:commentId: Get a comment and its child comments.
Example usage:
Retrieve a comment with its child comments:
curl http://localhost:3000/comments/1

Remember to adjust the URL and data in the examples to match your specific use case.

Dockerization

The project is dockerized to ensure that it runs consistently across different environments. You can find the Dockerfile in the project directory.

License

This project is licensed under the MIT License. See the LICENSE file for details.

Feel free to customize this README file to include any additional information or details specific to your project. This is a basic template to get you started.


This  README provides clear instructions on how to use the API endpoints of your commenting system, including example `curl` commands for making requests to those endpoints. Make sure to adjust the URLs and data in the examples to match your specific use case.


