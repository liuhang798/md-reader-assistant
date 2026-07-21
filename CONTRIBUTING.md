# Contributing

Thank you for helping improve MD Reader Assistant.

## Development setup

1. Install Go 1.23+, Node.js 22+, Wails 2.13, and the platform dependencies required by Wails.
2. Install frontend dependencies with `npm install` in `frontend`.
3. Run the desktop development build with `wails dev`.

## Before submitting a change

Run:

```bash
go test ./...
cd frontend
npm run build
```

Keep changes focused, update both README files when user-facing behavior changes, and include screenshots for visible interface changes. Do not commit `frontend/node_modules`, `frontend/dist`, or files under `build/bin`.

## Issues and pull requests

- Describe the expected and actual behavior.
- Include the operating system and application version.
- Attach a minimal Markdown file when it helps reproduce a rendering or editor problem.
- Never include private documents, credentials, or personal information in an issue.
