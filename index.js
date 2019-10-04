const https = require('https')
const OrientDB = require('orientjs')
const debug = require('debug')('orientdb.loader')

const DB_NAME = 'RickAndMorty'
const CHARACTER_CLASSNAME = 'Character'
const EPISODE_CLASSNAME = 'Episode'
const LOCATION_CLASSNAME = 'Location'
const MENTIONS_EDGENAME = 'MENTIONS'
const VISITED_EDGENAME = 'VISITED'

const createDbEventually = async (server, dbName) => {
  const dbs = await server.list()

  let db = dbs.find(({ name }) => name === dbName)
  if (!db) {
    db = await server.create({
      name:    dbName,
      type:    'graph',
      storage: 'plocal'
    })
    debug(`created database '${db.name}'`)
  } else {
    debug(`database '${dbName}' already exists`)
  }
  return db
}

const createVertexEventually = async (db, className) =>{
  const classes = await db.class.list()

  let C = classes.find(({ name }) => name === className)
  if (!C) {
    C = await db.class.create(className, 'V');
    debug(`created class 'V:${C.name}'`)
  } else {
    debug(`class 'V:${C.name}' already exists`)
  }
  return C
}

const createEdgeEventually = async (db, className) =>{
  const classes = await db.class.list()

  let C = classes.find(({ name }) => name === className)
  if (!C) {
    C = await db.class.create(className, 'E');
    debug(`created class 'E:${C.name}'`)
  } else {
    debug(`class 'E:${C.name}' already exists`)
  }
  return C
}

const fetchAllCharacters = async () => {
  const characters = []
  let totalPageCount = 1
  for (let currentPage = 1 ; currentPage <= totalPageCount ; currentPage++) {
    const response = await new Promise((resolve, reject) =>
      https
        .get(`https://rickandmortyapi.com/api/character/?page=${currentPage}`, (resp) => {
          let data = ''
          resp.on('data', (chunk) => data += chunk)
          resp.on('end', () => resolve(JSON.parse(data)))
        })
        .on('error', reject)
    )
    debug(`fetching character page #${currentPage}, ${response.results.length} characters`)
    totalPageCount = response.info.pages
    characters.push(...response.results)
  }
  debug(`total of ${characters.length} characters`)
  return characters
}

const fetchAllEpisodes = async () => {
  const episodes = []
  let totalPageCount = 1
  for (let currentPage = 1 ; currentPage <= totalPageCount ; currentPage++) {
    const response = await new Promise((resolve, reject) =>
      https
        .get(`https://rickandmortyapi.com/api/episode/?page=${currentPage}`, (resp) => {
          let data = ''
          resp.on('data', (chunk) => data += chunk)
          resp.on('end', () => resolve(JSON.parse(data)))
        })
        .on('error', reject)
    )
    debug(`fetching episode page #${currentPage}, ${response.results.length} episodes`)
    totalPageCount = response.info.pages
    episodes.push(...response.results)
  }
  debug(`total of ${episodes.length} episodes`)
  return episodes
}

const fetchAllLocations = async () => {
  const locations = []
  let totalPageCount = 1
  for (let currentPage = 1 ; currentPage <= totalPageCount ; currentPage++) {
    const response = await new Promise((resolve, reject) =>
      https
        .get(`https://rickandmortyapi.com/api/location/?page=${currentPage}`, (resp) => {
          let data = ''
          resp.on('data', (chunk) => data += chunk)
          resp.on('end', () => resolve(JSON.parse(data)))
        })
        .on('error', reject)
    )
    debug(`fetching episode page #${currentPage}, ${response.results.length} locations`)
    totalPageCount = response.info.pages
    locations.push(...response.results)
  }
  debug(`total of ${locations.length} locations`)
  return locations
}

const run = async () => {
  const server = OrientDB({
    host:     process.env.ORIENTDB_HOST     || 'localhost',
    port:     process.env.ORIENTDB_PORT     || 2424,
    username: process.env.ORIENTDB_USERNAME || 'root',
    password: process.env.ORIENTDB_PASSWORD || 'rootpwd'
  })

  const db = await createDbEventually(server, DB_NAME)

  // await db.query('DELETE VERTEX Character')
  // await db.query('DELETE VERTEX Episode')
  // await db.query('DELETE VERTEX Location')
  // await db.query('DELETE EDGE MENTIONS')
  // await db.query('DELETE EDGE VISITED')

  const Character = await createVertexEventually(db, CHARACTER_CLASSNAME)
  const Episode = await createVertexEventually(db, EPISODE_CLASSNAME)
  const Location = await createVertexEventually(db, LOCATION_CLASSNAME)
  const PlaysIn = await createEdgeEventually(db, MENTIONS_EDGENAME)
  const WasLocatedOn = await createEdgeEventually(db, VISITED_EDGENAME)

  const characters = await fetchAllCharacters()
  const episodes = await fetchAllEpisodes()
  const locations = await fetchAllLocations()

  for ({ id, name, species } of characters) {
    await Character.create({
      id,
      name,
      species
    })
    debug(`Created character: ${name}`)
  }

  for ({ id, name, episode } of episodes) {
    await Episode.create({
      id,
      name,
      episode
    })
    debug(`Created episode: ${episode} - ${name}`)
  }

  for ({ id, name } of locations) {
    await Location.create({
      id,
      name
    })
    debug(`Created location: ${name} - ${name}`)
  }

  for (character of characters) {
    const characterEpisodeIds = character.episode.map((e) => +e.split('/api/episode/')[1]).join(',')
    if (characterEpisodeIds.length > 0) {
      await db.query(`
        CREATE EDGE MENTIONS FROM (
          SELECT * FROM Episode WHERE id IN [${characterEpisodeIds}]
        ) to (
          SELECT * FROM Character WHERE id = ${character.id}
        )
      `)
      debug(`Character#${character.id} <-- MENTIONS -- Episode#[${characterEpisodeIds}]`)
    }
  }

  for (location of locations) {
    const locationResidentsIds = location.residents.map((e) => +e.split('/api/character/')[1]).join(',')
    if (locationResidentsIds.length > 0) {
      await db.query(`
        CREATE EDGE VISITED FROM (
          SELECT * FROM Character WHERE id IN [${locationResidentsIds}]
        ) to (
          SELECT * FROM Location WHERE id = ${location.id}
        )
      `)
      debug(`Location#${location.id} <-- VISITED -- Character[${locationResidentsIds}]`)
    }
  }

  server.close()
}

run()
  .catch(console.error)
