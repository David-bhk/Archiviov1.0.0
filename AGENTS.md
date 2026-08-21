## Application Building Context

Read the following files in order before analyzing,
planning, reviewing, implementing, or making any
architectural decision:

1. `context/project-overview.md` — product definition,
   goals, features, and scope
2. `context/architecture.md` — system structure,
   boundaries, storage model, and invariants
3. `context/current-state-audit.md` — verified gaps,
   risks, and implementation priorities
4. `context/ui-context.md` — theme, colors, typography,
   and component conventions
5. `context/code-standards.md` — implementation rules
   and conventions
6. `context/ai-workflow-rules.md` — development workflow,
   scoping rules, and delivery approach
7. `context/progress-tracker.md` — current phase,
   completed work, open questions, and next steps

Do not invent missing business rules, authorization
behavior, data relationships, or security requirements.
Inspect the implementation and tests, then record any
unresolved contradiction explicitly.

Update `context/progress-tracker.md` after each
meaningful implementation change.

If implementation changes the architecture, scope, or
standards documented in the context files, update the
relevant file before continuing.
