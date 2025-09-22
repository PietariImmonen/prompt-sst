#!/bin/bash

# Kill any existing processes
pkill -f "vite.*5173" 2>/dev/null || true
pkill -f "electron.*out/main" 2>/dev/null || true

echo "Starting Vite dev server for renderer..."
bunx electron-vite dev --rendererOnly &
VITE_PID=$!

echo "Waiting for Vite dev server to start..."
sleep 3

echo "Starting Electron with dev server URL..."
ELECTRON_RENDERER_URL=http://localhost:5173 ./node_modules/.bin/electron out/main/index.js > electron.log 2>&1 &
ELECTRON_PID=$!

echo "Desktop app started!"
echo "Vite PID: $VITE_PID"
echo "Electron PID: $ELECTRON_PID"
echo ""
echo "Press Ctrl+C to stop both processes"

# Handle Ctrl+C
trap "echo 'Stopping processes...'; kill $VITE_PID $ELECTRON_PID 2>/dev/null || true; exit 0" INT

# Wait for either process to exit
while kill -0 $VITE_PID 2>/dev/null && kill -0 $ELECTRON_PID 2>/dev/null; do
  sleep 1
done

echo "One of the processes has exited. Checking electron log..."
if [ -f electron.log ]; then
  echo "=== Electron Log ==="
  cat electron.log
fi
kill $VITE_PID $ELECTRON_PID 2>/dev/null || true