module.exports = function (RED) {
    function PrismaProCalibrationSetupNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const calibrationMixture = JSON.parse(config.calibrationMixture);

        node.on('input', function (msg) {
            const rows = createRecipeRows(calibrationMixture);

            const recipe = {
                name: "DefaultRecipe",
                dwell: config.dwellTime,
                mode: "MASSES",
                rows: rows
            }

            msg.measurementConfig = {
                dwellTime: config.dwellTime,
                calibrationScanRuns: config.calibrationScanRuns,
                calibrationMixture,
                recipe
            }

            if(areAmuOverlapping(calibrationMixture)){
                node.warn("No overlap allowed! " +
                    "This error occurred because the substances in the gas mixture you set for the " +
                    "calibration measurement have overlapping atomic masses. Therefore the prerequisite: " +
                    "NO OVERLAPPING ATOMIC MASSES IN CALIBRATION MEASUREMENT was not satisfied.")
                return
            }

            try {
                node.send(msg)
            } catch (e) {
                node.warn(e)
            }
        });
    }

    function createRecipeRows(calibrationMixture) {
        const rows = _.uniq(_.flatten(calibrationMixture
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
    function areAmuOverlapping(calibrationMixture){
        const all_atomic_masses = _.flatten(calibrationMixture.map(obj => [...obj.atomic_masses]));
        return all_atomic_masses.length !== _.uniq(all_atomic_masses).length
    }

    RED.nodes.registerType("prismaProCalibrationSetup", PrismaProCalibrationSetupNode);
}
