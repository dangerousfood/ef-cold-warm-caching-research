# Cold Warm Caching Research
This application will thread block execution and log each `SSTORE` and `SLOAD` for every block. Additionally it will log and cache the data (for stopping and restarting) into a postgres database.

## Setup
```bash
pnpm i
pnpm pg:start
cp env.sample .env
```

## Run
Before running ensure you have updated `BEACON_API_URL` and `NODE_URL` in the `.env` file
```
pnpm build
pnpm start
```
