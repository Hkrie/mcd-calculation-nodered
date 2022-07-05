const {calcConcentrations} = require("../../../prismapro-mcd-calculation-ts");
const {resolveIonCurrents} = require("../../../prismapro-mcd-calculation-ts");
const {RecipeScanSetupTranslator} = require("../../../prisma-pro");
const {PrismaService} = require("../../../prisma-pro");
const {_} = require("lodash");

module.exports = function (RED) {
    function DoTestGasMeasurementNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        const client = RED.nodes.getNode(config.client);
        node.config = {
            client,
        };
        node.customConfig = {
            dwellTime: config.dwellTime,
            testGasMixture: JSON.parse(config.testGasMixture)
        };

        node.on('input', function (msg) {
            const testGasMixture = node.customConfig.testGasMixture;
            const payload = JSON.parse(msg.payload);

            // node.warn(payload)
            const rows = _.uniq(
                _.flatten(testGasMixture
                    .map(obj => {
                        return obj["atomic_masses"].map(amu => {
                            return {
                                mass: amu,
                                type: "MASS",
                            }
                        })
                    })))
                .sort((a, b) => a.mass - b.mass);
            rows.unshift({
                type: "SPECIAL",
                special: "PRESSURE"
            })

            const recipe = {
                name: "DefaultRecipe",
                dwell: node.customConfig.dwellTime,
                mode: "MASSES",
                // row (channel) for measurement:
                rows: rows
            }

            const proportions = payload.proportions;
            const calibrationFactors = payload.calibrationFactors;

            // node.warn(testGasMixture.map(obj=> obj.atomic_masses))

            const prismaService = new PrismaService({
                host: node.config.client.config.host,//"https://192.168.1.100:8080"//je nach nutzereinabe bei der ip für das prismapro verändern.
                timeout: 2500
            })
            const recipeScanSetupTranslator = new RecipeScanSetupTranslator(recipe, prismaService, null);

            (async () => {
                    try {
                        const response = await recipeScanSetupTranslator.setScanSetup();

                        await node.config.client.sendRequest("/mmsp/generalControl/set?setEmission=On");
                        await node.config.client.sendRequest("/mmsp/generalControl/set?setEM=On");
                        await node.config.client.sendRequest("/mmsp/scanSetup/set?scanStart=1");
                        node.warn("everything was started")

                        let lastScanNumber = 0;
                        const intervalId = setInterval(async () => {// check for finished calibration measurement
                            const measurement_response = await node.config.client.sendRequest("/mmsp/measurement/scans/-1/get");
                            const lastCompleteMeasurement = await measurement_response.json();
                            // node.warn(lastCompleteMeasurement)
                            if (lastScanNumber < lastCompleteMeasurement.data.scannum) {
                                lastScanNumber = lastCompleteMeasurement.data.scannum;

                                const resolved_ion_currents = await resolveIonCurrents(proportions, lastCompleteMeasurement, testGasMixture, recipe);
                                const concentrations = await calcConcentrations(testGasMixture, calibrationFactors, resolved_ion_currents);
                                msg.payload = {};
                                msg.payload.concentrations = concentrations;
                                // if(!msg.payload.allMeasuredConcentrations){
                                //     msg.payload.allMeasuredConcentrations = [];
                                // }
                                // msg.payload.allMeasuredConcentrations.push({
                                //     timestamp: +new Date(),
                                //     concentrations
                                // })
                                node.warn(msg.payload)
                                node.send(msg);
                            }
                        }, 3000);
                    } catch
                        (e) {
                        node.warn(e);
                    }
                }
            )();
        });
    }

    RED.nodes.registerType("doTestGasMeasurement", DoTestGasMeasurementNode);
};
