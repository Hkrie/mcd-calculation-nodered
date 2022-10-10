const fs = require("fs");

module.exports = function (RED) {
    function SaveCalibrationResultNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', async function (msg) {
            const proportions = msg.calibrationRun.proportions;
            const sensitivities = msg.calibrationRun.sensitivities;
            let savedCalibrationData = {};

            if (!fs.existsSync(config.file)) {
                savedCalibrationData = {
                    proportions: proportions,
                    sensitivities: sensitivities
                };
            } else {
                const fileData = getFileContent(config.file);
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

            async function getFileContent(path) {
                return fs.readFile(path, 'utf8');
            }
        });
    }

    RED.nodes.registerType("saveCalibrationResult", SaveCalibrationResultNode);
}
