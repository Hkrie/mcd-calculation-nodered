module.exports = function (RED) {

    function StartScanNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        const client = RED.nodes.getNode(config.client);
        node.config = {
            client,
        };

        node.on('input', function (msg) {

            node.config.client.sendRequest("/mmsp/scanSetup/set?scanstart=1").then((res) => {
                return res.json();
            })
                .then((res) => {
                    msg.payload = res;
                    node.send(msg);
                })
                .catch((err) => {
                    node.log(err);
                })

        });
    }
    RED.nodes.registerType("startScan", StartScanNode);
}
