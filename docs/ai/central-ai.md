# Central AI

## Model

- Every meaningful part of the system should be exposed to AI as tools.
- Tools are grouped into skills.
- Skills are made available to one central AI system.
- The AI system uses a defined system prompt.

## Permissions

- The AI has exactly the same access as the active user, including the platform owner.
- The AI must not have hidden elevated permissions.
- AI actions that act on behalf of the user should require user confirmation where appropriate.
- The AI should use real tools and skills rather than fake intent parsing only.
- The AI should be able to do anything the current user can do, as long as that capability exists as tools.
- Reads can run directly.
- Mutations require explicit confirmation.
- Before a mutation executes, the AI should tell the user what it is about to do and present a clear confirmation path.

## UI

- The UI can render structured interfaces inside the chat window itself.
- Confirmation should be represented with an explicit confirm action in the UI rather than being hidden in plain text alone.
