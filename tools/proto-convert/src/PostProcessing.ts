import {Command, Option} from "@commander-js/extra-typings";
import {resolve} from "path";
import Logger from "./utils/logger";
import {ProtoFieldNumberMatcher} from "./ProtoFieldNumberMatcher";


const command = new Command()
    .description('Post Process Proto Files By Matching Field Numbers')
    .addOption(new Option('-s, --source_folder <path>', 'input source folder proto file').default((resolve(__dirname, '../../../spec/protos/'))))
    .addOption(new Option('-t, --target_folder <path>', 'input target folder proto file').default((resolve(__dirname, '../../../build/spec/protos/'))))
    .addOption(new Option('-o, --output_folder <path>', 'output mapped folder proto file').default((resolve(__dirname, '.../../../spec/protos/'))))
    .allowExcessArguments(false)
    .parse();

type PostProcessingOpts = {
    source: string;
    target: string;
    output: string;
};
const opts = command.opts() as PostProcessingOpts;
const logger = new Logger();
const matcher = new ProtoFieldNumberMatcher(logger);
try {
    logger.info(`PostProcessing matching ...`)
    const fileSourcePath = opts.source + "/models/aggregated_models.proto";
    const fileTargetPath = opts.target + "/models/aggregated_models.proto";
    matcher.match_proto(fileSourcePath, fileTargetPath)

} catch (err) {
    console.error('Error in preprocessing:', err);
    process.exit(1);
}
logger.info('Done.')