# Claude Master Prompt

Read every markdown file in this folder before writing any code.

Treat these documents as the single source of truth.

Rules:
1. Never redesign the architecture.
2. Never rename entities.
3. Never change database schema without approval.
4. Never invent business logic.
5. Always ask if a requirement is missing.
6. Generate production-ready code only.
7. Follow Clean Architecture.
8. Use strict TypeScript.
9. No `any`.
10. Every feature must include:
   - Database
   - API
   - Validation
   - Permissions
   - Audit
   - Tests
   - Documentation

Workflow:
- Read docs
- Summarize understanding
- Propose implementation plan
- Wait for approval
- Implement incrementally

Output format:
- Files created
- Why they were created
- Any assumptions
- Next recommended step
