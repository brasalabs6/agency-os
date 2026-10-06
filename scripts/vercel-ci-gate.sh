#!/usr/bin/env bash
set -euo pipefail

# Vercel Ignored Build Step:
#   exit 1 -> proceed with build
#   exit 0 -> skip this deployment
#
# Preview deployments build immediately. Production (main) waits for the
# GitHub Actions job named "Quality Gate" on the exact commit.

BRANCH="${VERCEL_GIT_COMMIT_REF:-$(git branch --show-current)}"
SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"
REPO="brasalabs6/agency-os"

if [[ "$BRANCH" != "main" ]]; then
  echo "Preview branch '$BRANCH': allowing Vercel preview build."
  exit 1
fi

echo "Production branch detected. Waiting for GitHub Quality Gate on $SHA."

for attempt in $(seq 1 40); do
  payload="$(curl --fail --silent --show-error     -H "Accept: application/vnd.github+json"     -H "X-GitHub-Api-Version: 2022-11-28"     -H "User-Agent: agency-os-vercel-ci-gate"     "https://api.github.com/repos/$REPO/commits/$SHA/check-runs?per_page=100")"

  read -r successful running failed < <(
    printf '%s' "$payload" | node -e '
      let input = "";
      process.stdin.on("data", (chunk) => input += chunk);
      process.stdin.on("end", () => {
        const runs = JSON.parse(input).check_runs.filter((run) => run.name === "Quality Gate");
        const successful = runs.filter((run) => run.conclusion === "success").length;
        const running = runs.filter((run) => run.status !== "completed" || run.conclusion == null).length;
        const failed = runs.filter((run) => run.status === "completed" && run.conclusion && !["success", "skipped"].includes(run.conclusion)).length;
        console.log(successful + " " + running + " " + failed);
      });
    '
  )

  if [[ "$successful" -gt 0 ]]; then
    echo "Quality Gate passed. Proceeding with production build."
    exit 1
  fi

  if [[ "$failed" -gt 0 && "$running" -eq 0 ]]; then
    echo "Quality Gate failed. Ignoring production deployment."
    exit 0
  fi

  echo "Quality Gate not green yet (attempt $attempt/40)."
  sleep 15
done

echo "Quality Gate did not become green within 10 minutes. Ignoring production deployment."
exit 0
