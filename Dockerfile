FROM denoland/deno:2.2.11@sha256:d7375240bf886d994996dd2d41d4fedaf9e01e8d35eb6dcba88d9dced8d72050
LABEL org.opencontainers.image.source="https://github.com/xCykrix/Arcanis"

# Create Working Directories
WORKDIR /6f97d8537032b449

# Copy Source
COPY . .

# Compile the Main App
RUN deno cache mod.ts

# Start Deno Application
CMD ["deno", "run", "-A", "--unstable-kv", "mod.ts"]
