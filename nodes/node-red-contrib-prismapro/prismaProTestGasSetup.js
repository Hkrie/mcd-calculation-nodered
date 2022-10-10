module.exports = function (RED) {
    function PrismaProTestGasSetupNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const testGasMixture = JSON.parse(config.testGasMixture);

        node.on('input', function (msg) {
            const rows = createRecipeRows(testGasMixture);

            const recipe = {
                name: "DefaultRecipe",
                dwell: config.dwellTime,
                mode: "MASSES",
                rows: rows
            }

            msg.measurementConfig = {
                dwellTime: config.dwellTime,
                referenceElementSymbol: config.referenceElement,
                testGasMixture,
                recipe,
                calibrationResult: {
                    proportions: msg.payload.proportions,
                    sensitivities: msg.payload.sensitivities
                }
            }
            msg.payload = {};

            try {
                node.send(msg)
            } catch (e) {
                node.warn(e)
            }
        });
    }

    function createRecipeRows(testGasMixture) {
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
        return rows
    }

    RED.nodes.registerType("prismaProTestGasSetup", PrismaProTestGasSetupNode);
}
