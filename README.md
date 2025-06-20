# Forum Fullstack App

A modern fullstack forum application built with Next.js, FastAPI, and PostgreSQL. Features real-time discussions, user authentication, and a clean, responsive interface.

## Tech Stack

**Frontend:**

- Next.js - React framework for production
- Mantine UI - Modern React components library
- AuthJS - Authentication for Next.js
- Prisma ORM - Type-safe database client

**Backend:**

- FastAPI - Modern, fast web framework for building APIs
- Python - Backend programming language
- PostgreSQL - Relational database

## Features

- User authentication with GitHub OAuth
- Create and participate in forum discussions
- Real-time updates and interactions
- Responsive design that works on all devices
- Type-safe database operations with Prisma
- Fast and modern API with FastAPI

## Prerequisites

Make sure you have the following installed:

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- PostgreSQL
- Yarn package manager

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/forum_db
GITHUB_ID=your_github_oauth_app_id
GITHUB_SECRET=your_github_oauth_app_secret
NEXTAUTH_URL=http://localhost:3000/api/auth
NEXT_PUBLIC_API_ADDRESS=localhost:8000
GEMINI_API_KEY=your_gemini_api_key
SLACK_WEBHOOK=your_slack_webhook_url
```

### Setting up OAuth with GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env` file

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd llm-fullstack-forum
```

### 2. Frontend Setup

```bash
# Install dependencies
yarn install

# Set up the database
npx prisma generate
npx prisma db push

# Start the development server
yarn dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set the Gemini API key
export GEMINI_API_KEY=your_gemini_api_key

#Set the Slack webhook url
export SLACK_WEBHOOK=your_slack_webhook_url

# Start the FastAPI server
python main.py
```

The backend API will be available at `http://localhost:8000`

## Development

### Frontend Development

- The Next.js app runs on port 3000
- Hot reload is enabled for development
- Mantine UI components provide consistent styling
- AuthJS handles authentication flows

### Backend Development

- FastAPI provides automatic API documentation at `http://localhost:8000/docs`
- The API supports CORS for frontend communication
- Database operations are handled through the FastAPI endpoints

### Database Management

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# View your data in Prisma Studio
npx prisma studio
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` to explore the interactive API documentation powered by FastAPI's automatic OpenAPI generation.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

**Database Connection Issues:**

- Ensure PostgreSQL is running
- Verify your `DATABASE_URL` is correct
- Run `npx prisma db push` to sync your schema

**Authentication Issues:**

- Check your GitHub OAuth app settings
- Verify `NEXTAUTH_URL` matches your setup
- Ensure GitHub OAuth callback URL is correct

**API Connection Issues:**

- Confirm the backend is running on port 8000
- Check that `NEXT_PUBLIC_API_ADDRESS` is set correctly
- Verify CORS settings if making requests from different origins

## License

This project is licensed under the MIT License - see the LICENSE file for details.
