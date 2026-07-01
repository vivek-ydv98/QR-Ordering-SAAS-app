# Configuration Files & Build Settings

This document details the configuration files in the project, explaining their purpose and build settings.

---

## 1. Frontend Configuration Files

### 1.1. `package.json` (frontend)
*   **Purpose**: Declares project dependencies, scripts, and runtime engines.
*   **Key Dependencies**:
    *   `next` (v15.1.0): React framework for server rendering and routing.
    *   `react` & `react-dom` (v19.0.0): Core view rendering libraries.
    *   `zustand` (v5.0.2): Client state management with localStorage persistence.
    *   `socket.io-client` (v4.8.1): Real-time WebSockets communication client.
    *   `lucide-react`: Icon pack for UI interfaces.
    *   `recharts`: Analytics charting library.
*   **Scripts**:
    *   `dev`: Starts the Next.js dev server on `http://localhost:3000`.
    *   `build`: Compiles the React codebase and outputs optimized production pages.

### 1.2. `next.config.mjs`
*   **Purpose**: Configures Next.js compilation, asset caching, image domains, and headers.
*   **Key Settings**: Includes configurations to allow Next.js to fetch food images from external hosts like Unsplash (`images.unsplash.com`) and Cloudinary without throwing security errors.

### 1.3. `tailwind.config.js`
*   **Purpose**: Defines styles tokens and extends Tailwind colors using CSS variables.
*   **Key Settings**: Colors (e.g. `border`, `background`, `primary`, `secondary`, `veg`, `nonveg`) are defined using the `hsl(var(--color) / <alpha-value>)` format. This allows the styling engine to update brand colors dynamically at runtime based on the resolved tenant settings.

### 1.4. `tsconfig.json` (frontend)
*   **Purpose**: Configures TypeScript compiler settings, target output levels, and path aliases.
*   **Key Settings**:
    *   `target`: `es5` or `es6` compatibility.
    *   `paths`: Configures absolute import aliases (e.g. `@/*` pointing to `src/*`) to make code references clean.

---

## 2. Backend Configuration Files

### 2.1. `package.json` (backend)
*   **Purpose**: Declares backend API server dependencies and run scripts.
*   **Key Dependencies**:
    *   `@nestjs/core` (v10.0.0): Backend framework.
    *   `@prisma/client`: Prisma database client.
    *   `passport-jwt` & `jwt`: Authentication strategy handlers.
    *   `class-validator` & `class-transformer`: Input validation pipelines.
    *   `socket.io` & `@nestjs/websockets`: Real-time WebSocket connection manager.
*   **Scripts**:
    *   `start:dev`: Starts the API server with auto-restart watchers.
    *   `build`: Compiles TypeScript files to JavaScript inside the `dist/` directory.

### 2.2. `tsconfig.json` (backend)
*   **Purpose**: Configures the TypeScript compiler for NestJS.
*   **Key Settings**: Enables `experimentalDecorators` and `emitDecoratorMetadata` to support NestJS decorators (e.g. `@Injectable()`, `@Controller()`).
