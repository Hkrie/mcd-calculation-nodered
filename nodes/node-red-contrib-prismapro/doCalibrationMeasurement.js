const {calcProportions, calcCalibrationFactors, calcPartialPressures} = require("../../../prisma-pro");
const {RecipeScanSetupTranslator} = require("../../../prisma-pro");
const {PrismaService} = require("../../../prisma-pro");
const {_} = require("lodash");


module.exports = function (RED) {
    function DoCalibrationMeasurementNode(config) {
        RED.nodes.createNode(this, config);
        const client = RED.nodes.getNode(config.client);
        var node = this;
        node.config = {
            client
        }
        node.customConfig = {
            dwellTime: config.dwellTime,
            calibrationMixture: JSON.parse(config.calibrationMixture),
            calibrationScanRuns: config.calibrationScanRuns,
            referenceElementSymbol: config.referenceElementSymbol || "N2"
        };
        node.warn(config.referenceElementSymbol)

        node.on('input', function (msg) {
            let payload = JSON.parse(msg.payload);
            const rows = _.uniq(
                _.flatten(node.customConfig.calibrationMixture
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
                rows: rows
            }

            const prismaService = new PrismaService({
                host: node.config.client.config.host,
                timeout: 2500
            })

            const recipeScanSetupTranslator = new RecipeScanSetupTranslator(recipe, prismaService, null);


            (async () => {
                try {
                    await recipeScanSetupTranslator.setScanSetup();
                    const all_atomic_masses = _.flatten(node.customConfig.calibrationMixture.map(obj => [...obj.atomic_masses]));
                    if (all_atomic_masses.length !== _.uniq(all_atomic_masses).length) {
                        throwError("No overlap allowed! " +
                            "This error occurred because the substances in the gas mixture you set for the " +
                            "calibration measurement have overlapping atomic masses. Therefore the prerequisite: " +
                            "NO OVERLAPPING ATOMIC MASSES IN CALIBRATION MEASUREMENT was not satisfied.")
                        return
                    }

                    await node.config.client.sendRequest("/mmsp/generalControl/set?setEmission=On");
                    await node.config.client.sendRequest("/mmsp/generalControl/set?setEM=On");
                    await node.config.client.sendRequest("/mmsp/scanSetup/set?scanStart=1");
                    node.warn("everything was started")

                    setTimeout(()=>{
                        const targetScanNumber = node.customConfig.calibrationScanRuns;
                        const intervalId = setInterval(async () => {
                            const res = await node.config.client.sendRequest("/mmsp/scanInfo/currentScan/get");
                            const result = await res.json();
                            const currentScanNumber = result.data;
                            if (currentScanNumber > targetScanNumber) {

                                clearInterval(intervalId)
                                await node.config.client.sendRequest("/mmsp/generalControl/setEmission/set?Off")
                                await node.config.client.sendRequest("/mmsp/generalControl/setEM/set?Off")
                                await node.config.client.sendRequest("/mmsp/scanSetup/scanStop/set?1")

                                const newPayload = await evaluateMeasurement();
                                node.warn("measurement evaluated")
                                msg.payload = await newPayload;
                                node.send(msg)
                            }
                        }, 3000)
                    }, 2000)
                } catch (e) {
                    node.warn(e);
                }
            })();

            async function evaluateMeasurement() {
                const calibrationMixture = node.customConfig.calibrationMixture;
                const referenceElementSymbol = node.customConfig.referenceElementSymbol;

                const res = await node.config.client.sendRequest("/mmsp/measurement/scans/get");
                const completeMeasurements = await res.json();

                const substance_amus_proportions = calcProportions(recipe, calibrationMixture, completeMeasurements);
                const partialPressures = calcPartialPressures(calibrationMixture, completeMeasurements);
                const calibration_factors = calcCalibrationFactors(calibrationMixture, recipe, completeMeasurements, partialPressures, referenceElementSymbol);

                //check if proportions etc. were already defined at least once before
                if (payload !== {} && payload.proportions) {
                    substance_amus_proportions.forEach(obj => {
                        const symbol_already_in_array = payload.proportions.filter(obj2 => obj2.symbol === obj.symbol).length;
                        if (!symbol_already_in_array) payload.proportions.push(obj)
                    })

                    partialPressures.forEach(obj => {
                        const symbol_already_in_array = payload.partialPressures.filter(obj2 => obj2.symbol === obj.symbol).length;
                        if (!symbol_already_in_array) payload.partialPressures.push(obj)
                    })

                    calibration_factors.forEach(obj => {
                        const symbol_already_in_array = payload.calibrationFactors.filter(obj2 => obj2.symbol === obj.symbol && obj2.amu === obj.amu).length;
                        if (!symbol_already_in_array) payload.calibrationFactors.push(obj)
                    })
                } else {
                    payload = {
                        proportions: substance_amus_proportions,
                        partialPressures: partialPressures,
                        calibrationFactors: calibration_factors
                    }
                }
                return payload;
            }

            function throwError(err) {
                throw new Error(err)
            }

            return msg;
        });
    }


    RED.nodes.registerType("doCalibrationMeasurement", DoCalibrationMeasurementNode);
}
