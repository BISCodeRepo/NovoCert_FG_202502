# NovoCert

NovoCert Electron Application

## Prerequisites

- Node.js
- npm or yarn
- Docker (for running pipeline steps)

## Local Development

Run the application in development mode:

```bash
npm install
npm run dev
```

## Build

### Mac

```bash
npm run build:mac
```

Output: `release/1.0.6/NovoCert-Mac-{version}-universal.dmg`

### Windows

```bash
npm run build:win
```

Output: `release/1.0.6/NovoCert-Windows-{version}-x64-Setup.exe`

## Other Commands

- `npm run build` - Build without packaging
- `npm run clean` - Clean build directories
- `npm run lint` - Run ESLint
