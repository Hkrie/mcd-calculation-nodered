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
            const testGasMixture = msg.testgasMeasurement.config.testGasMixture;
            const recipe = msg.testgasMeasurement.config.recipe;
            const referenceElementSymbol = msg.testgasMeasurement.config.referenceElementSymbol;

            const proportions = msg.testgasMeasurement.config.calibrationResult.proportions;
            const sensitivities = msg.testgasMeasurement.config.calibrationResult.sensitivities;

            const lastCompleteMeasurement = msg.testgasMeasurement.result.lastMeasurement;

            const calibrationFactors = calcCalibrationFactors(sensitivities, referenceElementSymbol);
            const resolveOrder = getResolveOrder(testGasMixture);
            const resolved_ion_currents = resolveIonCurrents(proportions, lastCompleteMeasurement, testGasMixture, recipe, resolveOrder);

            // msg.testgasMeasurement.result.lastConcentrations = calcConcentrations(testGasMixture, calibrationFactors, resolved_ion_currents);
            if(!msg.testgasMeasurement.result.allConcentrations){
                msg.testgasMeasurement.result.allConcentrations = [];
            }
            msg.testgasMeasurement.result.allConcentrations.push(calcConcentrations(testGasMixture, calibrationFactors, resolved_ion_currents));
            msg.payload.concentrations = calcConcentrations(testGasMixture, calibrationFactors, resolved_ion_currents);
            node.warn(msg.testgasMeasurement.result.allConcentrations)
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
