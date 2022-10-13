module.exports = function (RED) {
    const fetch = (url, init) => import("node-fetch").then(({default: fetch}) => fetch(url, init));

    return function ClientNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.config = {
            host: config.host[config.host.length - 1] === "/" ? config.host.slice(0, -1) : config.host,
            simulation: config.simulation,
            connecting: null,
            connected: false
        };

        node.sendRequest = function (path, options) {
            let baseUrl = node.config.host;
            if (!baseUrl.includes("http")) {
                baseUrl = "http://" + baseUrl;
            }
            return fetch(baseUrl + path, options)
        }
    }
}
