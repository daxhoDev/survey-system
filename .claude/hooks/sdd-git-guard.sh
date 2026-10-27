#!/usr/bin/env bash
# SDD harness git guard (AGENTS.md §5): no subagent pushes or merges, the Manager
# does so only with the user's approval, and only the Reviewer subagent commits.
# PreToolUse hook for the Bash tool.

input=$(cat)

# The Bash command (tool_input.command), still JSON-escaped.
command=$(printf '%s' "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"' | head -n 1 \
  | sed -E 's/^"command"[[:space:]]*:[[:space:]]*"//; s/"$//')
# The subagent running the command; empty in the main session.
agent=$(printf '%s' "$input" | grep -oE '"agent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed -E 's/.*"([^"]*)"$/\1/')

# `git <sub>` (optionally `git -C <dir> <sub>`) at the start of a command or after a separator.
runs() {
  printf '%s' "$command" | grep -qE "(^|[;&|(\`[:space:]]|\\\\n)git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+$1([^[:alnum:]_-]|$)"
}

decide() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"%s","permissionDecisionReason":"%s"}}\n' "$1" "$2"
  exit 0
}
deny() { decide deny "$1"; }

# Push and merge: never from a subagent; from the Manager, only with the user's approval.
for op in push merge; do
  if runs "$op"; then
    [ -n "$agent" ] && deny "SDD harness: no subagent runs git $op (AGENTS.md §5)."
    decide ask "SDD harness: git $op only when the user asked for it (AGENTS.md §5)."
  fi
done
if runs commit && [ "$agent" != "reviewer" ]; then
  deny "SDD harness: only the Reviewer commits, after the user's OK (AGENTS.md §5)."
fi
exit 0
