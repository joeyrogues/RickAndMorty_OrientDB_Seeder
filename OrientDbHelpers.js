const debug = require('debug')('RickAndMortyOrientLoader')

const createDbIfNotExists = async (server, dbName) => {
  const dbs = await server.list()

  let db = dbs.find(({ name }) => name === dbName)
  if (db) {
    debug(`database '${dbName}' already exists`)
    return db
  }
  db = await server.create({
    name:    dbName,
    type:    'graph',
    storage: 'plocal'
  })
  debug(`created database '${db.name}'`)
  return db
}

const createClassIfNotExists = async (db, classType, className) =>{
  const classes = await db.class.list()

  let C = classes.find(({ name }) => name === className)
  if (!C) {
    C = await db.class.create(className, classType);
    debug(`created class '${classType}:${C.name}'`)
  } else {
    debug(`class '${classType}:${C.name}' already exists`)
  }
  return C
}

module.exports = {
  createDbIfNotExists,
  createClassIfNotExists
}
