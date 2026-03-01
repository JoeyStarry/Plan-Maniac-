#!/bin/bash
# =============================================================
# Plan Maniac — Server Setup Script
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance
# Usage: bash setup-server.sh
# =============================================================

set -e

echo "🚀 Starting Plan Maniac server setup..."

# 1. Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Docker
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Add current user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# 4. Install Git
sudo apt-get install -y git

# 5. Clone the project
mkdir -p ~/plan-maniac
cd ~/plan-maniac
git clone https://github.com/JoeyStarry/Plan-Maniac-.git .

# 6. Create .env.prod (edit values before running docker compose!)
cat > .env.prod << 'EOF'
DB_PASSWORD=CHANGE_THIS_DB_PASSWORD
JWT_SECRET=CHANGE_THIS_JWT_SECRET_MIN_32_CHARS
VITE_API_URL=http://YOUR_SERVER_IP:3000
IMAGE_API=ghcr.io/joeystarry/plan-maniac-api:latest
IMAGE_WEB=ghcr.io/joeystarry/plan-maniac-web:latest
EOF

echo ""
echo "✅ Server setup complete!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "  1. Edit ~/plan-maniac/.env.prod with your actual values"
echo "  2. Run: docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
echo ""
echo "📋 Required GitHub Secrets (Settings > Secrets > Actions):"
echo "  SERVER_HOST     = your EC2 public IP"
echo "  SERVER_USER     = ubuntu"
echo "  SERVER_SSH_KEY  = your EC2 private key (.pem file content)"
echo "  DB_PASSWORD     = your database password"
echo "  JWT_SECRET      = your JWT secret (32+ chars)"
echo "  VITE_API_URL    = http://your-server-ip:3000"
