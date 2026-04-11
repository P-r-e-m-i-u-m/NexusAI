#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  _   _                   _    ___ "
echo " | \ | | _____  ___   _ _/ \  |_ _|"
echo " |  \| |/ _ \ \/ / | | / _ \  | | "
echo " | |\  |  __/>  <| |_| / ___ \ | | "
echo " |_| \_|\___/_/\_\\\\__,_/_/   \_\___|"
echo -e "${NC}"
echo "  Unified AI Agent Platform — Setup"
echo ""

# Check dependencies
for cmd in docker docker compose node python3; do
  if ! command -v $cmd &>/dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

# Create .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}Created .env from .env.example${NC}"
  echo -e "${YELLOW}Please edit .env and add your NVIDIA_API_KEY, then re-run this script.${NC}"
  exit 0
fi

# Check NVIDIA key
if grep -q "nvapi-your-key-here" .env; then
  echo -e "${YELLOW}WARNING: Please set your NVIDIA_API_KEY in .env before continuing.${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r; echo
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

echo -e "${BLUE}Starting NexusAI...${NC}"
docker compose up -d --build

echo ""
echo -e "${BLUE}Waiting for services to be healthy...${NC}"
sleep 10

MAX=30; COUNT=0
until curl -sf http://localhost:8000/health/ready > /dev/null 2>&1; do
  COUNT=$((COUNT+1))
  [ $COUNT -ge $MAX ] && echo "Timeout waiting for backend" && exit 1
  echo -n "."
  sleep 2
done

echo ""
echo -e "${GREEN}✓ NexusAI is ready!${NC}"
echo ""
echo "  Dashboard:    http://localhost:3000"
echo "  API Docs:     http://localhost:8000/docs"
echo "  Grafana:      http://localhost:3001  (admin / admin)"
echo "  Prometheus:   http://localhost:9090"
echo ""
echo "  To stop:   docker compose down"
echo "  To view logs: docker compose logs -f backend"
echo ""
