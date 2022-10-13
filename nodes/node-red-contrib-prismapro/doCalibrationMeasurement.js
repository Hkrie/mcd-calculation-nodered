const {calcProportions, calcSensitivities, calcPartialPressures} = require("../../../prisma-pro");

module.exports = function (RED) {
    function DoCalibrationMeasurementNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            const calibrationMixture = msg.calibrationMeasurement.config.calibrationMixture;
            const recipe = msg.calibrationMeasurement.config.recipe;
            const completeMeasurements = msg.calibrationMeasurement.measuredScanData;

            const substance_amus_proportions = calcProportions(recipe, calibrationMixture, completeMeasurements);
            const partialPressures = calcPartialPressures(calibrationMixture, completeMeasurements);
            const sensitivities = calcSensitivities(calibrationMixture, recipe, completeMeasurements, partialPressures);

            msg.calibrationMeasurement.result = {};
            msg.calibrationMeasurement.result.proportions = substance_amus_proportions;
            msg.calibrationMeasurement.result.sensitivities = sensitivities;

            try {
                node.send(msg)
            } catch (e) {
                node.warn(e)
            }
        });
    }


    RED.nodes.registerType("doCalibrationMeasurement", DoCalibrationMeasurementNode);
}
