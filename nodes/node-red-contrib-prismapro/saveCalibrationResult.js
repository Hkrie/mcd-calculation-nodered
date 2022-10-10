const fs = require("fs");

module.exports = function (RED) {
    function SaveCalibrationResultNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', async function (msg) {
            const filePath = msg.calibrationMeasurement.config.filePath ||  config.file;

            const proportions = msg.calibrationMeasurement.result.proportions;
            const sensitivities = msg.calibrationMeasurement.result.sensitivities;
            let savedCalibrationData = {};

            if (!fs.existsSync(filePath)) {
                savedCalibrationData = {
                    proportions: proportions,
                    sensitivities: sensitivities
                };
            } else {
                const fileData = getFileContent(filePath);
                savedCalibrationData = JSON.parse(await fileData);

                //check if proportions etc. were already defined at least once before
                if (savedCalibrationData !== {} && savedCalibrationData.proportions) {

                    proportions.forEach(obj => {
                        const symbol_already_in_array = savedCalibrationData.proportions.filter(obj2 => obj2.symbol === obj.symbol).length;
                        if (!symbol_already_in_array) savedCalibrationData.proportions.push(obj)
                    })

                    sensitivities.forEach(obj => {
                        const symbol_already_in_array = savedCalibrationData.sensitivities.filter(obj2 => obj2.symbol === obj.symbol && obj2.amu === obj.amu).length;
                        if (!symbol_already_in_array) savedCalibrationData.sensitivities.push(obj)
                    })
                } else {
                    savedCalibrationData = {
                        proportions: proportions,
                        sensitivities: sensitivities
                    }
                }
            }

            fs.writeFileSync(config.file, JSON.stringify(savedCalibrationData), "utf-8")

            try {
                msg.payload = "Calibration Measurement completed and data saved to " + path
                node.send(msg)
            } catch (e) {
                node.warn(e)
            }

        });
        async function getFileContent(path) {
            return fs.readFile(path, 'utf8');
        }
    }

    RED.nodes.registerType("saveCalibrationResult", SaveCalibrationResultNode);
}
