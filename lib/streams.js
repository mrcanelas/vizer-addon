const axios = require("axios");
const cheerio = require("cheerio");
const { StreamTapeExtractor, MixDropExtractor } = require("./extractors");

const ADDON_NAME = "Vizer.TV"
const WAREZ_URL = "https://warezcdn.com"
const EMBED_WAREZ_URL = "https://embed.warezcdn.net"
const PLAYERS = ["mixdrop", "streamtape"]

async function getStreams(type, id) {
    return new Promise(async (resolve, reject) => {
        const videos = await getVideos(type, id)
        const streams = []
        if (type === "movie") {
            await Promise.all(videos.map(async (item) => {
                await getVideosFromItem(item).then(stream => {
                    streams.push({
                        name: ADDON_NAME,
                        title: item.lang,
                        url: stream.url,
                    })
                })
            }))
            resolve({ streams })
        }
        if (type === "series") {
            const [imdbId, season, episode] = id.split(":")
            await Promise.all(videos.map(async (video) => {
                if (parseInt(episode) === video.warezEp) {
                    await getSerieAudio(video.id).then(async (response) => {
                        await Promise.all(response.map(async (item) => {
                            await getVideosFromItem(item).then(stream => {
                                streams.push({
                                    name: ADDON_NAME,
                                    title: item.lang,
                                    url: stream.url,
                                })
                            })
                        }))
                    })
                }
            }))
            resolve({ streams })
        }
    })
}

async function getVideos(type, id) {
    return new Promise(async (resolve, reject) => {
        if (type === "movie") {
            return await axios.get(`${EMBED_WAREZ_URL}/filme/${id}`)
                .then(response => {
                    if (response.status === 200) {
                        const $ = cheerio.load(response.data)
                        const items = $("div.hostList")
                        const videos = []
                        items.each((index, item) => {
                            videos.push({
                                lang: index === 0 ? "LEGENDADO" : "DUBLADO",
                                query: $(item).attr("data-audio-id")
                            })
                        })
                        resolve(videos.filter(x => x))
                    }
                })
        }
        if (type === "series") {
            const [imdbId, season, episode] = id.split(":")
            return await axios.get(`${EMBED_WAREZ_URL}/serie/${imdbId}/${season}/${episode}`)
                .then(response => {
                    if (response.status === 200) {
                        const $ = cheerio.load(response.data)
                        const items = $("div.item:not(item.active item.select)")
                        const videos = []
                        items.each(async (index, item) => {
                            const epName = $(item).find(".name").text()
                            if (epName) {
                                videos.push({
                                    warezEp: parseInt(epName.replace(/[^0-9]/g, '')),
                                    id: $(item).attr("data-load-episode-content")
                                })
                            }
                        })
                        resolve(videos.filter(x => x))
                    }
                })
        }
    })
}

async function getSerieAudio(id) {
    const body = new URLSearchParams({ getAudios: id })
    return await axios.post(`${EMBED_WAREZ_URL}/serieAjax.php`, body)
        .then(response => serieAudioParse(response.data))
}

async function serieAudioParse(data) {
    if (data) {
        const items = Object.entries(data.list)
        return items.map(([id, value]) => {
            return {
                lang: value.audio === "1" ? "LEGENDADO" : "DUBLADO",
                query: value.id
            }
        })
    }
}

function getVideosFromItem(item) {
    return new Promise(async (resolve, reject) => {
        const { lang, query } = item;
        const headers = {
            referer: WAREZ_URL,
        };
        PLAYERS.map(async (sv) => {
            const hostUrl = await axios
                .get(`${WAREZ_URL}/embed/getPlay.php?id=${query}&sv=${sv}`, { headers })
                .then((response) => cheerio.load(response.data)('script').text().match(/location\.href="([^"]+)"/)[1]);

            if (hostUrl.includes('streamtape')) { resolve(StreamTapeExtractor(hostUrl)) }
            //        if (hostUrl.includes('mixdrop')) { resolve(MixDropExtractor(hostUrl)) }
        })
    })
}

module.exports = { getStreams }
