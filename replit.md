# Archivio - File Archiving System

## Overview

Archivio is a local file archiving web application designed for document management and sharing within a local network. It provides a modern interface for uploading, organizing, searching, and managing files with role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript and Vite for fast development
- **Backend**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **UI Framework**: Tailwind CSS with shadcn/ui components for consistent design
- **State Management**: TanStack Query for server state management
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **File Storage**: Local file system with Multer for upload handling
- **Development**: ESM modules with hot module replacement

### Application Structure
The application follows a monorepo structure with shared types and schemas:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript types and database schemas

## Key Components

### Database Schema
The application uses three main entities:
- **Users**: Stores user accounts with roles (superuser, admin, user), department assignments, and authentication data
- **Departments**: Organizational units for grouping users and files
- **Files**: File metadata including original names, types, sizes, paths, and categorization

### Authentication System
- Role-based access control with three levels: superuser, admin, and user
- JWT token-based authentication stored in localStorage
- Password hashing using bcrypt
- Session management with automatic logout

### File Management
- Multi-format file support (PDF, Word, Excel, images)
- File type validation and size restrictions
- Metadata extraction and storage
- Categorization by department and custom categories
- Soft delete functionality for file recovery

### User Interface
- Responsive design using Tailwind CSS
- Component library based on Radix UI primitives
- Dark/light mode support
- Mobile-friendly interface
- Advanced search and filtering capabilities

## Data Flow

### File Upload Process
1. User selects files through the upload modal
2. Client validates file types and sizes
3. Files are sent to the backend API
4. Server processes uploads using Multer
5. File metadata is stored in the database
6. Files are saved to the local filesystem
7. UI updates with new file information

### Authentication Flow
1. User submits login credentials
2. Server validates credentials against database
3. JWT token is generated and returned
4. Token is stored in localStorage
5. Subsequent requests include token for authorization
6. Server validates token and role permissions

### Search and Filtering
1. User enters search query or applies filters
2. Frontend sends query parameters to API
3. Backend performs database queries with filters
4. Results are returned and displayed in the file grid
5. Real-time updates using TanStack Query

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing library
- **zod**: Schema validation library

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: JavaScript bundler for production

## Deployment Strategy

### Development Environment
- Vite development server for frontend with HMR
- Express server with file watching using tsx
- PostgreSQL database (local or cloud)
- Environment variables for configuration

### Production Build
- Frontend built with Vite to static assets
- Backend bundled with esbuild as single executable
- Database migrations handled by Drizzle Kit
- Static file serving through Express

### Configuration
- Environment variables for database connection
- Configurable file upload limits and allowed types
- Role-based feature toggles
- Department-based access restrictions

The application is designed to be easily deployable on various platforms while maintaining security and performance standards for local network usage.