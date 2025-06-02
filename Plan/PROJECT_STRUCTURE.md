# Voice Agent Project Structure

```
voice-agent/
│
├── Plan/                           # Planning and documentation
│   ├── VOICE_AGENT_TASKS.md       # Task list and timeline
│   ├── ARCHITECTURE.md            # System architecture
│   ├── TECHNICAL_SPEC.md          # Technical specifications
│   └── PROJECT_STRUCTURE.md       # This file
│
├── src/                           # Source code
│   ├── api/                       # REST API implementation
│   │   ├── controllers/           # Request handlers
│   │   │   ├── agents.controller.ts
│   │   │   ├── calls.controller.ts
│   │   │   └── knowledge.controller.ts
│   │   ├── middlewares/           # Express middlewares
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── routes/                # API routes
│   │   │   ├── agents.routes.ts
│   │   │   ├── calls.routes.ts
│   │   │   └── knowledge.routes.ts
│   │   └── validators/            # Request validators
│   │       ├── agents.validator.ts
│   │       └── calls.validator.ts
│   │
│   ├── websocket/                 # WebSocket server
│   │   ├── handlers/              # WebSocket event handlers
│   │   │   ├── auth.handler.ts
│   │   │   ├── media.handler.ts
│   │   │   └── call.handler.ts
│   │   ├── server.ts              # WebSocket server setup
│   │   └── session.manager.ts     # Session management
│   │
│   ├── services/                  # Business logic
│   │   ├── agent.service.ts       # Agent management
│   │   ├── call.service.ts        # Call orchestration
│   │   ├── twilio.service.ts      # Twilio integration
│   │   ├── gemini.service.ts      # Gemini API integration
│   │   ├── audio.service.ts       # Audio processing
│   │   └── knowledge.service.ts   # Knowledge base management
│   │
│   ├── workers/                   # Background job workers
│   │   ├── call.worker.ts         # Call processing worker
│   │   ├── audio.worker.ts        # Audio processing worker
│   │   └── knowledge.worker.ts    # Knowledge indexing worker
│   │
│   ├── models/                    # Database models
│   │   ├── agent.model.ts
│   │   ├── call.model.ts
│   │   └── knowledge.model.ts
│   │
│   ├── utils/                     # Utility functions
│   │   ├── audio/                 # Audio utilities
│   │   │   ├── converter.ts       # Format conversion
│   │   │   ├── vad.ts            # Voice Activity Detection
│   │   │   └── buffer.ts         # Audio buffering
│   │   ├── logger.ts             # Logging utility
│   │   ├── config.ts             # Configuration management
│   │   └── errors.ts             # Custom error classes
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── agent.types.ts
│   │   ├── call.types.ts
│   │   ├── audio.types.ts
│   │   └── api.types.ts
│   │
│   ├── database/                  # Database related
│   │   ├── migrations/            # Database migrations
│   │   ├── seeds/                 # Seed data
│   │   └── connection.ts          # Database connection
│   │
│   ├── app.ts                     # Express app setup
│   ├── server.ts                  # Main server file
│   └── index.ts                   # Entry point
│
├── tests/                         # Test files
│   ├── unit/                      # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── models/
│   ├── integration/               # Integration tests
│   │   ├── api/
│   │   └── websocket/
│   └── e2e/                       # End-to-end tests
│       └── scenarios/
│
├── scripts/                       # Utility scripts
│   ├── setup.sh                   # Initial setup script
│   ├── migrate.ts                 # Database migration script
│   ├── seed.ts                    # Database seeding script
│   └── test-call.ts              # Test call script
│
├── config/                        # Configuration files
│   ├── default.json              # Default configuration
│   ├── development.json          # Development config
│   ├── staging.json              # Staging config
│   └── production.json           # Production config
│
├── docker/                        # Docker related files
│   ├── Dockerfile                # Main application Dockerfile
│   ├── Dockerfile.worker         # Worker Dockerfile
│   └── docker-compose.yml        # Local development setup
│
├── k8s/                          # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── deployments/
│   │   ├── api.yaml
│   │   ├── websocket.yaml
│   │   └── workers.yaml
│   ├── services/
│   │   ├── api.yaml
│   │   └── websocket.yaml
│   └── ingress.yaml
│
├── docs/                         # Documentation
│   ├── API.md                    # API documentation
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── DEVELOPMENT.md            # Development guide
│   └── TROUBLESHOOTING.md        # Troubleshooting guide
│
├── .github/                      # GitHub specific files
│   ├── workflows/                # GitHub Actions
│   │   ├── ci.yml               # CI pipeline
│   │   ├── cd.yml               # CD pipeline
│   │   └── security.yml         # Security scanning
│   └── ISSUE_TEMPLATE/          # Issue templates
│
├── .env.example                  # Environment variables example
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── .gitignore                   # Git ignore file
├── tsconfig.json                # TypeScript configuration
├── package.json                 # NPM package file
├── package-lock.json            # NPM lock file
├── README.md                    # Project README
└── LICENSE                      # License file
```

## Key Directories Explained

### `/src/api/`
Contains all REST API related code including controllers, routes, and validators. Follows MVC pattern.

### `/src/websocket/`
Handles real-time WebSocket connections for audio streaming from Twilio.

### `/src/services/`
Business logic layer that contains the core functionality. Services are injected into controllers and workers.

### `/src/workers/`
Background job processors that handle async tasks like call processing and knowledge base indexing.

### `/src/utils/audio/`
Audio processing utilities including format conversion, VAD, and buffering logic.

### `/tests/`
Comprehensive test suite with unit, integration, and e2e tests.

### `/docker/`
Docker configuration for containerizing the application and its dependencies.

### `/k8s/`
Kubernetes manifests for production deployment and orchestration.

## File Naming Conventions

- **TypeScript files**: `camelCase.ts` or `kebab-case.ts`
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Configuration files**: `lowercase.json` or `lowercase.yaml`
- **Documentation**: `UPPERCASE.md` for main docs, `lowercase.md` for subdocs

## Module Organization

Each module should follow this structure:
```
module/
├── module.controller.ts    # HTTP request handling
├── module.service.ts       # Business logic
├── module.model.ts         # Database model
├── module.types.ts         # TypeScript types
├── module.validator.ts     # Input validation
└── module.test.ts          # Unit tests
```

---

Last Updated: 5/29/2025, 11:44:43 AM