FROM denoland/deno:2.2.10@sha256:7820b532b724f9283c8962de1cb2d3a7d31f5abc622c3a41ecb4c3d6b9111229

# Create Working Directories
WORKDIR /6f97d8537032b449

# Copy Source
COPY . .

# Compile the main app
RUN deno cache mod.ts

# Start Deno Application
CMD ["deno", "run", "-A", "--unstable-kv", "mod.ts"]
