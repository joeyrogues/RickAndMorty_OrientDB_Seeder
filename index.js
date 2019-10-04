const OrientDB = require('orientjs')
const debug = require('debug')('RickAndMortyOrientLoader')

const {
  fetchCharacters,
  fetchEpisodes,
  fetchLocations
} = require('./RickAndMortyApi')

const {
  createDbIfNotExists,
  createClassIfNotExists
} = require('./OrientDbHelpers')

const DB_NAME = 'RickAndMorty'
const CHARACTER_CLASSNAME = 'Character'
const EPISODE_CLASSNAME = 'Episode'
const LOCATION_CLASSNAME = 'Location'
const MENTIONS_EDGENAME = 'MENTIONS'
const VISITED_EDGENAME = 'VISITED'

const run = async () => {
  const server = OrientDB({
    host:     process.env.ORIENTDB_HOST     || 'localhost',
    port:     process.env.ORIENTDB_PORT     || 2424,
    username: process.env.ORIENTDB_USERNAME || 'root',
    password: process.env.ORIENTDB_PASSWORD || 'rootpwd'
  })

  const db = await createDbIfNotExists(server, DB_NAME)

  const pResources = [
    fetchCharacters(),
    fetchEpisodes(),
    fetchLocations()
  ]

  await Promise.all([
    db.query('DELETE VERTEX Character'),
    db.query('DELETE VERTEX Episode'),
    db.query('DELETE VERTEX Location'),
    db.query('DELETE EDGE MENTIONS'),
    db.query('DELETE EDGE VISITED')
  ])

  const [
    Character, Episode, Location, PlaysIn, WasLocatedOn
  ] = await Promise.all([
    createClassIfNotExists(db, 'V', CHARACTER_CLASSNAME),
    createClassIfNotExists(db, 'V', EPISODE_CLASSNAME),
    createClassIfNotExists(db, 'V', LOCATION_CLASSNAME),
    createClassIfNotExists(db, 'E', MENTIONS_EDGENAME),
    createClassIfNotExists(db, 'E', VISITED_EDGENAME)
  ])

  const [
    characters,
    episodes,
    locations
  ] = await Promise.all(pResources)

  await Promise.all([
    ...characters
      .map(({ id, name, species }) =>
        Character.create({ id, name, species })
        .then(() => debug(`Created character: ${name}`))
      ),
    ...episodes
      .map(({ id, name, episode }) =>
        Episode.create({ id, name, episode })
        .then(() => debug(`Created episode: ${episode}`))
      ),
    ...locations
      .map(({ id, name }) =>
        Location.create({ id, name })
        .then(() => debug(`Created location: ${name}`)
      ))
  ])

  await Promise.all(
    characters.map((character) => {
      const characterEpisodeIds = character.episode.map((e) => +e.split('/api/episode/')[1]).join(',')
      if (characterEpisodeIds.length === 0) {
        return
      }
      return db.query(`
        CREATE EDGE MENTIONS FROM (
          SELECT * FROM Episode WHERE id IN [${characterEpisodeIds}]
        ) to (
          SELECT * FROM Character WHERE id = ${character.id}
        )
      `).then((forward) => {
        debug(`Character#${character.id} <-- MENTIONS -- Episode#[${characterEpisodeIds}]`)
        return forward
      })
    })
  )
  await Promise.all(
    locations.map((location) => {
      const locationResidentsIds = location.residents.map((e) => +e.split('/api/character/')[1]).join(',')
      if (locationResidentsIds.length === 0) {
        return
      }
      return db.query(`
        CREATE EDGE VISITED FROM (
          SELECT * FROM Character WHERE id IN [${locationResidentsIds}]
        ) to (
          SELECT * FROM Location WHERE id = ${location.id}
        )
      `).then((forward) => {
        debug(`Location#${location.id} <-- VISITED -- Character[${locationResidentsIds}]`)
        return forward
      })
    })
  )

  await server.close()
  debug('Server closed - Success')
}

run()
  .catch(console.error)
