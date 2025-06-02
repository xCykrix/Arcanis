FROM denoland/deno:2.3.5
LABEL org.opencontainers.image.source="https://github.com/xCykrix/Arcanis"

# Create Working Directories
WORKDIR /6f97d8537032b449

# Copy Source
COPY . .

# Compile the Main App
RUN deno cache mod.ts

# Start Deno Application
CMD ["deno", "run", "-A", "--unstable-kv", "mod.ts"]
