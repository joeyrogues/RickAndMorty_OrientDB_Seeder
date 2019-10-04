const https = require('https')
const debug = require('debug')('RickAndMortyOrientLoader')


const _httpGetter = (url) =>
  () => new Promise((resolve, reject) =>
    https.get(url, (resp) => {
      let data = ''
      resp.on('data', (chunk) => data += chunk)
      resp.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  )

const _resourceFetcher = (resourceName) =>
  async () => {
    const URL = `https://rickandmortyapi.com/api/${resourceName}/`
    const firstResponse = await _httpGetter(`${URL}?page=${1}`)()
    const totalPageCount = firstResponse.info.pages

    const resources = (
      await Promise.all(
        new Array(totalPageCount)
          .fill(0)
          .map((_, i) =>
            _httpGetter(`${URL}/?page=${i + 1}`)()
          )
      )
    )
    .map((response, i) => {
      debug(`fetching ${resourceName} page #${i + 1}, ${response.results.length} ${resourceName}s`)
      return response.results
    })
    .reduce((resources, resourcesPage) => [...resources, ...resourcesPage], [])

    debug(`total of ${resources.length} ${resourceName}s`)
    return resources
  }

module.exports = {
  fetchCharacters: _resourceFetcher('character'),
  fetchEpisodes: _resourceFetcher('episode'),
  fetchLocations: _resourceFetcher('location')
}
