rm -r ./database/migration/orbital/*
rm -r ./database/migration/tenant/*
deno run --env=./.env -A npm:typeorm schema:drop -d ./database/data-source/orbital.ts
deno run --env=./.env -A npm:typeorm schema:drop -d ./database/data-source/tenant.ts
deno run --env=./.env -A npm:typeorm migration:generate -d ./database/data-source/orbital.ts ./database/migration/orbital/InitializeVersion1
deno run --env=./.env -A npm:typeorm migration:generate -d ./database/data-source/tenant.ts ./database/migration/tenant/InitializeVersion1
