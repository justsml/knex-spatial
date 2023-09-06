#!/usr/bin/env bash
# set -ex # Note: We need error codes to be 'returned' for this script to work
# IFS=$'\n\t'

## debug
# set -ex

# This script is used to manage a test database container for integration testing.
# Usage: ./scripts/testDb.sh [start|stop|kill|help]

# Get first argument as the action name, default to 'start'.
export ACTION=${1-"help"}
export CONTAINER_NAME=test-knex-spatial-db

# USE CONNECTION STRING:
# postgres://postgres:postgres@127.0.0.1:25432/postgres

function checkNode() {
  # check if node 18 is installed
  if ! node -v | grep "v18" >/dev/null; then
    # check for nvm
    if ! which nvm >/dev/null; then
      echo -e "\033[0;31m ❌ Setup Node v18 with nvm. https://nvm.sh/.\033[0m"
      exit 1
    fi

    if ! nvm use 2>/dev/null; then
      echo -e "\033[0;31m ❌ NVM is not installed.\033[0m"
      exit 1
    fi
  fi
}

function startDb() {
  docker run \
    --name "$CONTAINER_NAME" \
    -p 127.0.0.1:25432:5432 \
    --restart on-failure:5 \
    --detach \
    --shm-size=256mb \
    --env ON_ERROR_STOP=1 \
    --env POSTGRES_USER=postgres \
    --env POSTGRES_PASS=postgres \
    --env POSTGRES_PASSWORD=postgres \
    --env PGHOST=127.0.0.1 \
    --env PGUSER=postgres \
    --env PGPASSWORD=postgres \
    --env ALLOW_IP_RANGE=0.0.0.0/0 \
    --volume "$PWD/db:/app/db" \
    "$DOCKER_IMAGE" \
    postgres \
    -c 'listen_addresses=*' \
    -c 'password_encryption=scram-sha-256' \
    -c 'shared_memory_type=sysv' \
    -c 'shared_buffers=256MB' \
    -c 'max_connections=200'
}

function stopDb() {
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  echo -e "\033[0;32m🔽 Test DB stopped.\033[0m"
}

function killDb() {
  stopDb
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
  echo -e "\033[0;32m💀 Test DB DESTROYED.\033[0m"
}

function checkDockerService () {
  # Check if docker is working
  if ! docker info >/dev/null 2>&1; then
    echo -e "\033[0;31m ❌Docker is not running (or installed.) Please install or start Docker before running this script.\033[0m"
    exit 1
  fi
}

checkDockerService

# if ACTION equals "--help" or "help" or "-h" or "h"
if [[ "$ACTION" == "--help" ]] || [[ "$ACTION" == "-h" ]] || [[ "$ACTION" == "help" ]]; then
  printf "Test DB Management Script: testDb.sh\n\n\n"
  echo "This script is used to start and stop a test database"
  printf "container for integration testing.\n\n"

  printf "It is mainly used by the test script in package.json.\n\n"

  printf "Usage: ./scripts/testDb.sh [start|stop|kill|help]\n\n"
  echo "  start: Start the test database container."
  echo "  stop: Stop the test database container."
  echo "  kill: Stop and remove the test database container."
  echo "  help: Show this help message."
  exit 0

fi

if [[ "$ACTION" == "stop" ]]; then
  # Ignore errors if container doesn't exist
  stopDb
  exit 0
elif [ "$ACTION" == "kill" ]; then
  # Ignore errors if container doesn't exist
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
  echo -e "\033[0;32mTest Container DESTROYED.\033[0m"
  exit 0
elif [ "$ACTION" == "start" ]; then
  # For x86_64 AMD/Intel Processors:
  export DOCKER_IMAGE=postgis/postgis:14-3.2
  # if arch is arm64 or apple silicon, use the following:
  if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then
    export DOCKER_IMAGE=kartoza/postgis:14-3.3
  fi
  # Note: Test PORT: 25432

  # Check if container is already running
  # if running, print msg & continue.
  # if not running, start service!
  if docker ps | grep "$CONTAINER_NAME" >/dev/null; then
    echo -e "\033[0;33mTest DB already running.\033[0m" > /dev/null
  else
    echo -e "\033[0;32mStarting Test DB.\033[0m"
    if ! startDb; then
      echo -e "\033[0;31mTest DB failed to start.\033[0m"
      # stop and remove container
      docker stop "$CONTAINER_NAME" 2>/dev/null || true
      docker rm "$CONTAINER_NAME" 2>/dev/null || true
      # print error message, and instructions to re-run the command when ready
      printf "ERROR: \033[0;31mPlease try '%s' again.\033[0m\n\n" "$0"
      exit 1
    fi
    # Check for error code starting container
  fi

else
  printf "\033[0;31mInvalid action: %s\033[0m\n\n" "$ACTION"
  printf "Usage: ./scripts/testDb.sh [start|stop|kill|help]\n\n"
  exit 1
fi
