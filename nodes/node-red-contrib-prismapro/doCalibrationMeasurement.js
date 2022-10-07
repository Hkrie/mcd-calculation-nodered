const {calcProportions, calcSensitivities, calcPartialPressures} = require("../../../prisma-pro");

module.exports = function (RED) {
    function DoCalibrationMeasurementNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {

            let payload = JSON.parse(msg.payload);

            const calibrationMixture = node.measurementConfig.calibrationMixture;
            const recipe = msg.measurementConfig.recipe;
            const completeMeasurements = msg.measuredScanData;

            const substance_amus_proportions = calcProportions(recipe, calibrationMixture, completeMeasurements);
            const partialPressures = calcPartialPressures(calibrationMixture, completeMeasurements);
            const sensitivities = calcSensitivities(calibrationMixture, recipe, completeMeasurements, partialPressures);

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

                sensitivities.forEach(obj => {
                    const symbol_already_in_array = payload.sensitivities.filter(obj2 => obj2.symbol === obj.symbol && obj2.amu === obj.amu).length;
                    if (!symbol_already_in_array) payload.sensitivities.push(obj)
                })
            } else {
                payload = {
                    proportions: substance_amus_proportions,
                    partialPressures: partialPressures,
                    sensitivities: sensitivities
                }
            }
            msg.payload = payload;

            try {
                node.send(msg)
            } catch (e) {
                node.warn(e)
            }
        });
    }


    RED.nodes.registerType("doCalibrationMeasurement", DoCalibrationMeasurementNode);
}
