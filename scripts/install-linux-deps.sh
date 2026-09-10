#!/usr/bin/env bash
set -euo pipefail
sudo apt-get update
sudo apt-get install -y build-essential pkg-config clang ca-certificates libssl-dev \
  libx11-dev libxcursor-dev libxkbcommon-dev libxrandr-dev libxi-dev libxinerama-dev \
  libasound2-dev libpulse-dev libwayland-dev wayland-protocols libegl1-mesa-dev \
  libgl1-mesa-dev libgles2-mesa-dev libglx-dev libdrm-dev libgbm-dev

