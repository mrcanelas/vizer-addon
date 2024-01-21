const axios = require('axios');
const cheerio = require('cheerio');

async function MixDropExtractor(videoUrl) {
    try {
        const { data } = await axios.get(videoUrl);

        const match = cheerio.load(data)
            .html()
            .match(/(?<=p}\().*(?<=wurl).*\}/g);

        if (!match) {
            throw new Error("Video not found.");
        }
        const [p, a, c, k, e, d] = match[0]
            .split(",")
            .map((x) => x.split(".sp")[0]);
        const formated = this.format(p, a, c, k, e, JSON.parse(d));

        const [poster, source] = formated
            .match(/(?<=poster'=").+?(?=")|(?<=wurl=").+?(?=")/g)
            .map((x) => (x.startsWith("http") ? x : `https:${x}`));

        const behaviorHints = {
            notWebReady: true
        }

        const sources = {
            url: source,
            poster: poster,
            server: "MixDrop",
            behaviorHints,
        }

        return sources;
    } catch (err) {
        throw new Error(err.message);
    }
};

format = (p, a, c, k, e, d) => {
    k = k.split("|");
    e = (c) => {
        return c.toString(36);
    };
    if (!"".replace(/^/, String)) {
        while (c--) {
            d[c.toString(a)] = k[c] || c.toString(a);
        }
        k = [
            (e) => {
                return d[e];
            },
        ];
        e = () => {
            return "\\w+";
        };
        c = 1;
    }
    while (c--) {
        if (k[c]) {
            p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
        }
    }
    return p;
};


async function StreamTapeExtractor(videoUrl) {
    try {
        const { data } = await axios.get(videoUrl).catch((err) => {
            throw new Error("Video not found");
        });

        const $ = cheerio.load(data);

        let [fh, sh] = $.html()
            ?.match(/robotlink'\).innerHTML = (.*)'/)[1]
            .split("+ ('");

        sh = sh.substring(3);
        fh = fh.replace(/\'/g, "");

        const url = `https:${fh}${sh}`;

        return { url, server: "StreamTape" }
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = { MixDropExtractor, StreamTapeExtractor }
