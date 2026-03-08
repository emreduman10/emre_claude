#!/bin/zsh
source ~/.zshrc 2>/dev/null

cd "$(dirname "$0")"
npm run dev &

# Wait until Vite is ready
until curl -s http://localhost:5173 > /dev/null 2>&1; do
  sleep 1
done

open http://localhost:5173
wait
