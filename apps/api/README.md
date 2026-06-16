# Survey API System

A robust REST API for managing corporate surveys with secure authentication, data validation, and interactive documentation.

## Overview

This project provides a complete backend for creating, managing, and collecting survey responses. It's designed for scalability, security, and ease of integration.

### Key Features

- **User Management**: Registration, authentication, and authorization with JWT
- **Survey Management**: Create, update, and activate surveys with dynamic questions
- **Response Collection**: Receive and store responses in multiple formats
- **Access Control**: Secure authentication and user roles
- **Interactive Documentation**: Swagger explorer for direct testing

## Tech Stack

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Authentication**: JWT + bcrypt
- **Documentation**: OpenAPI/Swagger
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
src/
├── controllers/      # HTTP request handling logic
├── services/         # Business logic
├── repositories/     # Data access layer
├── routes/           # Route definitions
├── schemas/          # Data validation
├── middlewares/      # Express middlewares
├── lib/              # Utilities and configurations
├── utils/            # General helpers
├── generated/        # Prisma client (auto-generated)
```

## Prerequisites

- Node.js (v18+)
- PNPM (v10.33+)
- PostgreSQL (v12+)

## Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Run database migrations
pnpm exec prisma migrate dev

# Generate Prisma client
pnpm exec prisma generate
```

## Running the Application

```bash
# Development (with hot reload)
pnpm dev

# Production
pnpm build
pnpm start

# Tests
pnpm test
```

## API Documentation

Access the interactive Swagger documentation:

```http
GET http://localhost:8000/api/v1/docs
```

Access the raw OpenApi file:

```http
GET http://localhost:8000/api/v1/docs-raw
```

## Data Models

### Users

Manages system users with secure credentials.

### Surveys

Stores surveys with dynamic questions in JSON format.

### Answers

Records responses submitted by respondents.

### Refresh Tokens

Maintains session security with refresh tokens.

## Configuration

Required environment variables should be set in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Localhost port to be used
- `NODE_ENV`: Environment (development/production)
- `JWT_SECRET`: Secret string to sign JWTs
- `JWT_EXPIRES_IN`: JWT lifetime, given in minutes
- `JWT_COOKIE_EXPIRES_IN`: JWT cookie lifetime, given in {{minutes_amount}}min format
- `REFRESH_EXPIRES_IN`: Refresh token lifetime, given in days
- `REFRESH_COOKIE_EXPIRES_IN`: Refresh token cookie lifetime, given in days

## Security

- Passwords hashed with bcrypt
- JWT-based authentication
- CORS enabled and configurable
- Rate limiting on critical endpoints
- Security headers with Helmet

## Author

**Daxho**

## License

MIT

## Support

To report issues or suggestions, please create an issue in the repository.
