BRANCHING_RULE_V1 — Mainline Workflow

In this project a commit is a saved checkpoint of work you intend to keep, and a branch is only for temporary risky experiments; the default path is to make focused commits directly on main so history stays linear and truthful.

Hard rules:
1) Work directly on main by default.
2) Commits are checkpoints.
3) Branches are forbidden unless explicitly labeled “risky experiment.”
4) If a branch is used, name it `exp/<topic>-<yyyymmdd>` and delete it immediately after merge.

Standard daily flow (copy/paste):
- git pull
- work
- git status
- git add -A
- git commit -m "..."
- git push

Recovery: “I think I lost work” checklist:
- git status
- git log --oneline -10
- git reflog -10

Audit timing rule:
- Any audit doc must include the commit hash and date it was based on. If code changes after that commit, add an “Audit Delta” note to describe the gap.
