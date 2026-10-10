# Example PRD - Task List

This is an example PRD (Product Requirements Document) in Markdown format.
Ralphy will execute each unchecked task sequentially using your chosen AI engine.

## Best Practice: Micro-Tasks

Break large tasks into micro-tasks. Smaller tasks = better code quality.

**Bad:** `- [ ] Implement user authentication`
**Good:**
```
- [ ] Create User model with email and password fields
- [ ] Add password hashing utility function
- [ ] Create signup API endpoint
- [ ] Create login API endpoint
- [ ] Add session/token generation
- [ ] Create logout endpoint
```

## Project Setup

- [ ] Initialize the project with the chosen framework
- [ ] Install production dependencies
- [ ] Install development dependencies
- [ ] Configure ESLint with recommended rules
- [ ] Configure Prettier for code formatting
- [ ] Add pre-commit hooks for linting

## Core Features

- [ ] Create base layout component with header and footer
- [ ] Add navigation component with routing
- [ ] Create login form component
- [ ] Create signup form component
- [ ] Add logout button functionality
- [ ] Build dashboard page skeleton
- [ ] Add dashboard metrics cards
- [ ] Implement data fetching hooks

## Database & API

- [ ] Design and create the database schema
- [ ] Implement API endpoints for CRUD operations
- [ ] Add input validation and error handling

## UI/UX

- [ ] Style components with Tailwind CSS
- [ ] Add loading states and skeleton screens
- [ ] Implement toast notifications for user feedback
- [ ] Ensure responsive design for mobile devices

## Testing & Quality

- [ ] Write unit tests for core functions
- [ ] Add integration tests for API endpoints
- [ ] Test user flows end-to-end

## Deployment

- [ ] Configure environment variables for production
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production environment
- [ ] Verify deployment and run smoke tests

---

## Usage

Run with ralphy:

```bash
# Using default markdown format
ralphy

# Or explicitly specify the file
ralphy --prd example-prd.md
```

## Notes

- Tasks are marked complete automatically when the AI agent finishes them
- Completed tasks show as `- [x] Task description`
- Tasks are executed in order from top to bottom
