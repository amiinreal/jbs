# JBS - Jobs & Beyond Services

## Installation and Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Install additional required packages for file handling:
   ```
   node install-packages.js
   ```
4. Create a `.env` file based on the example:
   ```
   NODE_ENV=development
   PORT=3000
   SESSION_SECRET=your-secret-key
   DATABASE_URL=postgresql://username:password@localhost:5432/jbs
   ```
5. Start the server:
   ```
   npm start
   ```

## Features

- Jobs listings
- Housing listings
- Car listings
- Marketplace items
- Secure file uploads
- User authentication
- Messaging system
- Company verification

## Technologies

- Node.js
- Express
- PostgreSQL
- React
- Multer (File Uploads)

## Troubleshooting

If you encounter errors related to missing packages, please run:
