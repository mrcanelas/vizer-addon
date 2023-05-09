const { addonBuilder } = require("stremio-addon-sdk")
const manifest = require("./lib/manifest")
const { getStreams } = require("./lib/streams")

const builder = new addonBuilder(manifest)

builder.defineStreamHandler(({type, id}) => {
	return new Promise(async (resolve, reject) => {
		getStreams(type, id).then(response => resolve(response))
	})
})

module.exports = builder.getInterface()