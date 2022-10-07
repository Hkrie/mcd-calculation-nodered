const {
    calcCalibrationFactors,
    calcConcentrations,
    resolveIonCurrents,
    getResolveOrder
} = require("../../../mcd-calculation");
const {_} = require("lodash");

module.exports = function (RED) {
    function DoTestGasMeasurementNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        const client = RED.nodes.getNode(config.client);
        node.config = {
            client,
        };

        node.on('input', function (msg) {
            const testGasMixture = msg.measurementConfig.testGasMixture;
            const recipe = msg.measurementConfig.recipe;
            const referenceElementSymbol = msg.measurementConfig.referenceElementSymbol;

            const payload = JSON.parse(msg.payload);
            const proportions = payload.proportions;
            const sensitivities = payload.sensitivities;
            const lastCompleteMeasurement = msg.lastMeasurementResult;

            const calibrationFactors = calcCalibrationFactors(sensitivities, referenceElementSymbol);
            const resolveOrder = getResolveOrder(testGasMixture);
            const resolved_ion_currents = resolveIonCurrents(proportions, lastCompleteMeasurement, testGasMixture, recipe, resolveOrder);

            msg.payload.concentrations = calcConcentrations(testGasMixture, calibrationFactors, resolved_ion_currents);
            try {
                node.send(msg);
            } catch
                (e) {
                node.warn(e);
            }
        });
    }

    RED.nodes.registerType("doTestGasMeasurement", DoTestGasMeasurementNode);
};
