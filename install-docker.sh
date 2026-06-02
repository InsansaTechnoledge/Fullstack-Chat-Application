#!/bin/bash

set -e

echo "Updating package index..."
sudo apt update

echo "Installing prerequisites..."
sudo apt install -y ca-certificates curl gnupg lsb-release

echo "Creating Docker keyring directory..."
sudo mkdir -p /etc/apt/keyrings

echo "Adding Docker GPG key..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "Adding Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Updating package index with Docker repository..."
sudo apt update

echo "Installing Docker..."
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

echo "Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

echo "Adding current user to docker group..."
sudo usermod -aG docker "$USER"

echo ""
echo "Docker installation completed."
echo ""
echo "Docker version:"
docker --version || true

echo ""
echo "Docker service status:"
sudo systemctl --no-pager status docker

echo ""
echo "IMPORTANT:"
echo "Log out and log back in, or run:"
echo "newgrp docker"
echo "to use Docker without sudo."