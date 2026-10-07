#!/usr/bin/env bash
set -euo pipefail

# Vercel Ignored Build Step:
#   exit 1 -> proceed with build
#   exit 0 -> skip this deployment
#
# Preview deployments build immediately. Production (main) waits for the
# latest main/push CI workflow for the exact commit. Any GitHub API/network/
# parse failure fails closed by skipping the deployment.

BRANCH="${VERCEL_GIT_COMMIT_REF:-$(git branch --show-current)}"
SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"
REPO="brasalabs6/agency-os"

if [[ "$BRANCH" != "main" ]]; then
  echo "Preview branch '$BRANCH': allowing Vercel preview build."
  exit 1
fi

echo "Production branch detected. Waiting for main CI on $SHA."

for attempt in $(seq 1 30); do
  api_url="https://api.github.com/repos/$REPO/actions/runs?branch=main&event=push&head_sha=$SHA&per_page=20"

  if ! payload="$(curl --fail --silent --show-error     --retry 2     --retry-delay 2     --retry-all-errors     -H "Accept: application/vnd.github+json"     -H "X-GitHub-Api-Version: 2022-11-28"     -H "User-Agent: agency-os-vercel-ci-gate"     "$api_url")"; then
    echo "Unable to query GitHub Actions. Failing closed; deployment will be skipped."
    exit 0
  fi

  if ! state="$(printf '%s' "$payload" | SHA="$SHA" node --input-type=module -e '
    let input = "";
    process.stdin.on("data", (chunk) => input += chunk);
    process.stdin.on("end", () => {
      try {
        const payload = JSON.parse(input);
        const runs = (payload.workflow_runs ?? [])
          .filter((run) =>
            run.name === "CI" &&
            run.head_sha === process.env.SHA &&
            run.head_branch === "main" &&
            run.event === "push"
          )
          .sort((a, b) => b.id - a.id);

        const latest = runs[0];
        if (!latest) {
          console.log("missing");
          return;
        }

        if (latest.status !== "completed") {
          console.log("running");
          return;
        }

        console.log(latest.conclusion === "success" ? "success" : "failed");
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(2);
      }
    });
  ')"; then
    echo "Unable to parse GitHub Actions response. Failing closed; deployment will be skipped."
    exit 0
  fi

  echo "Main CI state: $state (attempt $attempt/30)."

  case "$state" in
    success)
      echo "Quality Gate passed on main. Proceeding with production build."
      exit 1
      ;;
    failed)
      echo "Main CI failed. Ignoring production deployment."
      exit 0
      ;;
    missing|running)
      sleep 20
      ;;
    *)
      echo "Unexpected CI state '$state'. Failing closed; deployment will be skipped."
      exit 0
      ;;
  esac
done

echo "Main CI did not become green within 10 minutes. Ignoring production deployment."
exit 0
