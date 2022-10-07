const {RecipeScanSetupTranslator} = require("../../../prisma-pro");
const {PrismaService} = require("../../../prisma-pro");
const {_} = require("lodash");


module.exports = function (RED) {
    var ClientNode = require("./client");
    RED.nodes.registerType("prismapro-testgas-client", ClientNode(RED), {});

    function PrismaProTestGasClientNode(config) {
        RED.nodes.createNode(this, config);
        const client = RED.nodes.getNode(config.client);
        const node = this;
        node.config = {
            client
        }

        node.on('input', function (msg) {
            const prismaService = new PrismaService({
                host: node.config.client.config.host,
                timeout: 2500
            })


            const recipeScanSetupTranslator = new RecipeScanSetupTranslator(msg.measurementConfig.recipe, prismaService, null);

            (async () => {
                try {
                    if (msg.payload === "stopMeasurement") {
                        await node.config.client.sendRequest("/mmsp/generalControl/setEmission/set?Off")
                        await node.config.client.sendRequest("/mmsp/generalControl/setEM/set?Off")
                        await node.config.client.sendRequest("/mmsp/scanSetup/scanStop/set?1")
                        return
                    }

                    await recipeScanSetupTranslator.setScanSetup();

                    await node.config.client.sendRequest("/mmsp/generalControl/set?setEmission=On");
                    await node.config.client.sendRequest("/mmsp/generalControl/set?setEM=On");
                    await node.config.client.sendRequest("/mmsp/scanSetup/set?scanStart=1");

                    const countOfAmuMeasured = msg.measurementConfig.recipe.rows.length;
                    const timeoutTime = msg.measurementConfig.dwellTime * countOfAmuMeasured;

                    const intervalId = setInterval(async () => {
                        const result = await node.config.client.sendRequest("/mmsp/scanInfo/currentScan/get").json();
                        const currentScanNumber = result.data;
                        node.warn(currentScanNumber);
                        if (currentScanNumber > targetScanNumber) {
                            clearInterval(intervalId)

                            const lastMeasurementResult = await node.config.client.sendRequest("/mmsp/measurement/scans/-1/get");
                            msg.lastMeasurementResult = await lastMeasurementResult.json();

                            const completeMeasurementResult = await node.config.client.sendRequest("/mmsp/measurement/scans/get");
                            msg.completeMeasuredScanData = await completeMeasurementResult.json();
                            node.send(msg)


                        }
                    }, timeoutTime)

                } catch (e) {
                    node.warn(e);
                }
            })();
        });
    }


    RED.nodes.registerType("prismaProTestGasClient", PrismaProTestGasClientNode);
}
