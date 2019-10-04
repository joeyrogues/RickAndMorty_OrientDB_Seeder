const https = require('https')
const debug = require('debug')('RickAndMortyOrientLoader')

const _resourceFetcher = (resourceName) =>
  async () => {
    const resources = []
    let totalPageCount = 1
    for (let currentPage = 1 ; currentPage <= totalPageCount ; currentPage++) {
      const response = await new Promise((resolve, reject) =>
        https.get(`https://rickandmortyapi.com/api/${resourceName}/?page=${currentPage}`, (resp) => {
          let data = ''
          resp.on('data', (chunk) => data += chunk)
          resp.on('end', () => resolve(JSON.parse(data)))
        }).on('error', reject)
      )
      debug(`fetching episode page #${currentPage}, ${response.results.length} ${resourceName}s`)
      totalPageCount = response.info.pages
      resources.push(...response.results)
    }
    debug(`total of ${resources.length} ${resourceName}s`)
    return resources
  }

const fetchCharacters = _resourceFetcher('character')

const fetchEpisodes = _resourceFetcher('episode')

const fetchLocations = _resourceFetcher('location')

module.exports = {
  fetchCharacters,
  fetchEpisodes,
  fetchLocations
}
