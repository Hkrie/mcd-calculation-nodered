const {calcProportions, calcSensitivities, calcPartialPressures} = require("../../../prisma-pro");

module.exports = function (RED) {
    function DoCalibrationMeasurementNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            const calibrationMixture = node.measurementConfig.calibrationMixture;
            const recipe = msg.measurementConfig.recipe;
            const completeMeasurements = msg.measuredScanData;

            const substance_amus_proportions = calcProportions(recipe, calibrationMixture, completeMeasurements);
            const partialPressures = calcPartialPressures(calibrationMixture, completeMeasurements);
            const sensitivities = calcSensitivities(calibrationMixture, recipe, completeMeasurements, partialPressures);

            msg.calibrationRun = {};
            msg.calibrationRun.proportions = substance_amus_proportions;
            msg.calibrationRun.sensitivities = sensitivities;

            try {
                node.send(msg)
            } catch (e) {
                node.warn(e)
            }
        });
    }


    RED.nodes.registerType("doCalibrationMeasurement", DoCalibrationMeasurementNode);
}
