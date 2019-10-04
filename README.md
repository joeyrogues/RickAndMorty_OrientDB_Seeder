# Description

Loads Rick and Morty data into orientdb

# How to

## Run some orientdb
```bash
docker run -d --name orientdb -p 2424:2424 -p 2480:2480 -e ORIENTDB_ROOT_PASSWORD=rootpwd orientdb
```

## Wubba Lubba dub dub the database
```bash
ORIENTDB_USERNAME=root \
ORIENTDB_PASSWORD=rootpwd \
ORIENTDB_HOST=localhost \
ORIENTDB_PORT=2424 \
DEBUG=orientdb.loader \
npm start
```
