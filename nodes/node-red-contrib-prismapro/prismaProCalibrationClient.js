const {RecipeScanSetupTranslator} = require("../../../prisma-pro");
const {PrismaService} = require("../../../prisma-pro");
const {_} = require("lodash");


module.exports = function (RED) {
    var ClientNode = require("./client");
    RED.nodes.registerType("prismapro-client", ClientNode(RED), {});

    function PrismaProCalibrationClientNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        if(config.client){
            createClient(config.client)
        }

        node.on('input', function (msg) {
            if(!config.client){
                try{
                    createClient(msg.calibrationMeasurement.config.client)
                }catch (e) {
                    throw e
                }
            }

            const prismaService = new PrismaService({
                host: node.config.client.config.host,
                timeout: 2500
            })

            const recipeScanSetupTranslator = new RecipeScanSetupTranslator(msg.calibrationMeasurement.config.recipe, prismaService, null);

            (async () => {
                try {
                    await recipeScanSetupTranslator.setScanSetup();

                    await node.config.client.sendRequest("/mmsp/generalControl/set?setEmission=On");
                    await node.config.client.sendRequest("/mmsp/generalControl/set?setEM=On");
                    await node.config.client.sendRequest("/mmsp/scanSetup/set?scanStart=1");

                    const countOfAmuMeasured = msg.calibrationMeasurement.config.recipe.rows.length;
                    const timeoutTime = msg.calibrationMeasurement.config.dwellTime * countOfAmuMeasured;

                    const targetScanNumber = msg.calibrationMeasurement.config.calibrationScanRuns;
                    const intervalId = setInterval(async () => {
                        const result = await node.config.client.sendRequest("/mmsp/scanInfo/currentScan/get").json();
                        const currentScanNumber = result.data;
                        node.warn(currentScanNumber);
                        if (currentScanNumber > targetScanNumber) {
                            clearInterval(intervalId)

                            const completeMeasurementResult = await node.config.client.sendRequest("/mmsp/measurement/scans/get");
                            msg.calibrationMeasurement.measuredScanData = await completeMeasurementResult.json();
                            node.send(msg)

                            await node.config.client.sendRequest("/mmsp/generalControl/setEmission/set?Off")
                            await node.config.client.sendRequest("/mmsp/generalControl/setEM/set?Off")
                            await node.config.client.sendRequest("/mmsp/scanSetup/scanStop/set?1")
                        }
                    }, timeoutTime)
                } catch (e) {
                    node.warn(e);
                }
            })();
        });

        function createClient(clientConfig){
            const client = RED.nodes.getNode(clientConfig);
            node.config = {
                client
            }
        }
    }


    RED.nodes.registerType("prismaProCalibrationClient", PrismaProCalibrationClientNode);
}
