#!/bin/bash
# Raise Piston's output limit (default 1024 chars) so problems with large output
# are judged instead of killed. Run on the Piston VM (Azure portal → VM → Run command
# → RunShellScript). Safe to re-run.
#
# Keeps everything already installed: the running container is saved as an image
# first, and the new one gets the same volumes, port and restart policy. The old
# container is kept (stopped) as piston_api_old for a quick rollback:
#   docker rm -f piston_api && docker rename piston_api_old piston_api && docker start piston_api
set -e

if docker inspect piston_api --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -q '^PISTON_OUTPUT_MAX_SIZE=65536$'; then
  echo "Already raised."; docker ps --filter name=piston_api; exit 0
fi

VOLS=$(docker inspect piston_api --format '{{range .Mounts}} -v {{.Source}}:{{.Destination}}{{end}}')
echo "Volumes:${VOLS:- none}"
docker commit piston_api piston-local:keep >/dev/null
docker stop piston_api >/dev/null
docker rm -f piston_api_old >/dev/null 2>&1 || true
docker rename piston_api piston_api_old

docker run -d --name piston_api --privileged --restart unless-stopped -p 2000:2000 $VOLS \
  -e PISTON_OUTPUT_MAX_SIZE=65536 \
  piston-local:keep >/dev/null

sleep 6
docker ps --filter name=piston_api
echo "Runtimes:"; curl -s localhost:2000/api/v2/runtimes | grep -o '"language":"[a-z+]*","version":"[0-9.]*"'
echo "Output test (1 = fixed, 0 = still capped):"
curl -s localhost:2000/api/v2/execute -H 'Content-Type: application/json' \
  -d '{"language":"python","version":"*","files":[{"content":"print(\"x\"*2999)"}]}' | grep -c 'x\{2999\}'
