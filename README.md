# Archivio - File Archiving System

## Overview
Archivio is a local file archiving web application for document management and sharing within a local network. It features a modern interface for uploading, organizing, searching, and managing files with role-based access control.

## Features
- **Role-based access control**: Superuser, Admin, and User roles
- **Department-based file management**: Users access files from their own department
- **Secure authentication**: JWT tokens and bcrypt password hashing
- **File upload & validation**: Supports PDF, Word, Excel, images, with type and size restrictions
- **Metadata extraction**: Stores file details and categorization
- **Soft delete**: Recover deleted files
- **Responsive UI**: Tailwind CSS, shadcn/ui, dark/light mode, mobile-friendly
- **Advanced search & filtering**: Real-time updates with TanStack Query

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js, TypeScript, Node.js
- **Database**: SQLite (migration-ready for PostgreSQL), Prisma ORM
- **UI Framework**: Tailwind CSS, shadcn/ui
- **State Management**: TanStack Query
- **Authentication**: JWT, bcrypt
- **File Storage**: Local filesystem, Multer
- **Routing**: Wouter

## Application Structure
- `client/` - React frontend
- `server/` - Express.js backend
- `shared/` - Shared types and schemas

## Usage
1. Clone the repository
2. Install dependencies: `npm install` (in both `client` and `server`)
3. Configure environment variables
4. Run database migrations and seed script
5. Start the development servers

## Recent Changes
- Department-based access control
- Secure file upload and management
- Migration to SQLite + Prisma
- Automated seed script for user creation

## License
MIT
