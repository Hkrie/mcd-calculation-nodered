const {PrismaService} = require("../../../prisma-pro");
const {RecipeScanSetupTranslator} = require("../../../prisma-pro");

module.exports = function (RED) {
    var ClientNode = require("./client");
    RED.nodes.registerType("prismapro-client", ClientNode(RED), {});

    function PrismaProSetupNode(config) {
        RED.nodes.createNode(this, config);
        this.custonConfig = config;
        var node = this;
        const client = RED.nodes.getNode(config.client);
        node.config = {
            client,
        };
        node.on('input', function (msg) {
            console.log(node.custonConfig)

            const recipe = {
                id: "",
                name: "DefaultRecipe",
                isDefault: true,
                fromAMU: node.custonConfig.minAmu,
                toAMU: node.custonConfig.maxAmu,
                pointsPerAMU: node.custonConfig.ppAmu,
                dwell: node.custonConfig.dwellTime,
                mode: "",//string,
                rows: null//RecipeRow[]
            }
            const prismaService = new PrismaService(null)
            const RecipeScanSetupTranslator = new RecipeScanSetupTranslator(recipe, prismaService, null)
            RecipeScanSetupTranslator
                .setScanSetup()
                .then(() => {
                    msg.recipe = recipe;
                    msg.calibrationMixture = node.custonConfig.calibrationMixture;
                    msg.testGasMixture = node.custonConfig.testGasMixture;
                    msg.referenceElementSymbol = node.custonConfig.referenceElement;
                    node.send(msg);
                })
                .catch(err => console.log(err))
            return msg;
        });
    }


    RED.nodes.registerType("prismaProSetup", PrismaProSetupNode);
}
