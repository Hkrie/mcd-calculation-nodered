const {RecipeScanSetupTranslator} = require("../../../prisma-pro");
const {PrismaService} = require("../../../prisma-pro");
const {_} = require("lodash");


module.exports = function (RED) {
    var ClientNode = require("./client");
    RED.nodes.registerType("prismapro-client", ClientNode(RED), {});

    function PrismaProCalibrationClientNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        if (config.client) {
            addClientToNode(config.client)
        }

        node.on('input', function (msg) {
            if (!node.config.client) {
                try {
                    addClientToNode(msg.calibrationMeasurement.config.client)
                } catch (e) {
                    throw e
                }
            }

            const prismaService = new PrismaService({
                host: getHost(msg.calibrationMeasurement.config),
                timeout: 2500
            })

            const recipeScanSetupTranslator = new RecipeScanSetupTranslator(msg.calibrationMeasurement.config.recipe, prismaService, null);

            (async () => {
                try {
                    if (msg.payload === "stopMeasurement") {
                        node.warn("payload contains stopMeasurement, Therefore the measurement is stopped.")
                        stopMeasurement()
                        return
                    }

                    await startMeasurement(recipeScanSetupTranslator);

                    const countOfAmuMeasured = msg.calibrationMeasurement.config.recipe.rows.length;
                    const timeoutTime = msg.calibrationMeasurement.config.dwellTime * countOfAmuMeasured;

                    const targetScanNumber = msg.calibrationMeasurement.config.calibrationScanRuns;
                    const intervalId = setInterval(async () => {
                        const result = await node.config.client.sendRequest("/mmsp/scanInfo/currentScan/get");
                        const resultJson = await result.json();
                        const currentScanNumber = await resultJson.data;
                        node.warn(currentScanNumber);
                        if (currentScanNumber > targetScanNumber) {
                            const completeMeasurementResult = await node.config.client.sendRequest("/mmsp/measurement/scans/get");
                            msg.calibrationMeasurement.measuredScanData = await completeMeasurementResult.json();
                            node.send(msg)

                            clearInterval(intervalId)
                            stopMeasurement()
                        }
                    }, timeoutTime)
                } catch (e) {
                    node.warn(e);
                }
            })();
        });

        function addClientToNode(client) {
            const newClient = RED.nodes.getNode(client);
            node.config = {
                client: newClient
            }
        }

        async function stopMeasurement() {
            try {
                await node.config.client.sendRequest("/mmsp/generalControl/setEmission/set?Off")
                // await node.config.client.sendRequest("/mmsp/generalControl/setEM/set?Off")
                await node.config.client.sendRequest("/mmsp/scanSetup/scanStop/set?1")
            } catch (e) {
                throw e
            }
        }

        async function startMeasurement(recipeScanSetupTranslator) {
            try {
                const recipeResponse = await recipeScanSetupTranslator.setScanSetup();
                node.warn(await recipeResponse)
                // einlass an
                await node.config.client.sendRequest("/mmsp/generalControl/set?setEmission=On");
                // await node.config.client.sendRequest("/mmsp/generalControl/set?setEM=On");
                await node.config.client.sendRequest("/mmsp/scanSetup/set?scanStart=1");
            } catch (e) {
                throw e
            }


            node.warn("Started Scan!")
        }

        function getHost(calibrationMeasurementConfig) {
            if (calibrationMeasurementConfig.client && calibrationMeasurementConfig.client.host) {
                return calibrationMeasurementConfig.client.host
            } else {
                return node.config.client.config.host
            }
        }


    }


    RED.nodes.registerType("prismaProCalibrationClient", PrismaProCalibrationClientNode);
}
