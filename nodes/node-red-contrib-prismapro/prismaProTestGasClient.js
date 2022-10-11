const {RecipeScanSetupTranslator} = require("../../../prisma-pro");
const {PrismaService} = require("../../../prisma-pro");
const {_} = require("lodash");


module.exports = function (RED) {
    var ClientNode = require("./client");
    RED.nodes.registerType("prismapro-testgas-client", ClientNode(RED), {});

    function PrismaProTestGasClientNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        if (config.client) {
            createClient(config.client)
        }

        node.on('input', function (msg) {
            if (!config.client) {
                try {
                    createClient(msg.testgasMeasurement.config.client)
                } catch (e) {
                    throw e
                }
            }

            const prismaService = new PrismaService({
                host: node.config.client.config.host,
                timeout: 2500
            })


            const recipeScanSetupTranslator = new RecipeScanSetupTranslator(msg.testgasMeasurement.config.recipe, prismaService, null);

            (async () => {
                try {
                    if (msg.payload === "stopMeasurement") {
                        stopMeasurement()
                        return
                    }

                    startMeasurement(recipeScanSetupTranslator)

                    const countOfAmuMeasured = msg.testgasMeasurement.config.recipe.rows.length;
                    const timeoutTime = msg.testgasMeasurement.config.dwellTime * countOfAmuMeasured;

                    setInterval(async () => {
                        const lastMeasurementResult = await node.config.client.sendRequest("/mmsp/measurement/scans/-1/get");
                        msg.testgasMeasurement.result.lastMeasurement = await lastMeasurementResult.json();

                        // const completeMeasurementResult = await node.config.client.sendRequest("/mmsp/measurement/scans/get");
                        // msg.testgasMeasurement.result.allMeasurements = await completeMeasurementResult.json();
                        node.send(msg)
                    }, timeoutTime)
                } catch (e) {
                    node.warn(e);
                }
            })();
        });

        function createClient(clientConfig) {
            const client = RED.nodes.getNode(clientConfig);
            node.config = {
                client
            }
        }

        async function stopMeasurement() {
            await node.config.client.sendRequest("/mmsp/generalControl/setEmission/set?Off")
            await node.config.client.sendRequest("/mmsp/generalControl/setEM/set?Off")
            await node.config.client.sendRequest("/mmsp/scanSetup/scanStop/set?1")
        }

        async function startMeasurement(recipeScanSetupTranslator) {
            await recipeScanSetupTranslator.setScanSetup();

            await node.config.client.sendRequest("/mmsp/generalControl/set?setEmission=On");
            await node.config.client.sendRequest("/mmsp/generalControl/set?setEM=On");
            await node.config.client.sendRequest("/mmsp/scanSetup/set?scanStart=1");
        }
    }

    RED.nodes.registerType("prismaProTestGasClient", PrismaProTestGasClientNode);
}
