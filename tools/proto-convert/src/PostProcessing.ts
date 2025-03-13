import {Command, Option} from "@commander-js/extra-typings";
import path, {resolve} from "path";
import Logger from "./utils/logger";
import {ProtoFieldNumberMatcher} from "./ProtoFieldNumberMatcher";
import {util} from "protobufjs";
import fs = util.fs;

const command = new Command()
    .description('Post Process Proto Files By Matching Field Numbers')
    .addOption(new Option('-s, --source_folder <path>', 'input source folder proto file').default((resolve(__dirname, '../../../spec/protos/'))))
    .addOption(new Option('-t, --target_folder <path>', 'input target folder proto file').default((resolve(__dirname, '../../../build/'))))
    .addOption(new Option('-o, --output_folder <path>', 'output mapped folder proto file').default((resolve(__dirname, '.../../../spec/protos/'))))
    .allowExcessArguments(false)
    .parse();


type PostProcessingOpts = {
    source: string;
    target: string;
    output: string;
};
const opts: PostProcessingOpts = {
    source: command.opts().source_folder,
    target: command.opts().target_folder,
    output: command.opts().output_folder
};
const logger = new Logger();
const matcher = new ProtoFieldNumberMatcher(logger);
try {
    for (const folder of ["models", "services"]) {
        const source = path.join(opts.source, folder);
        const target = path.join(opts.target, folder);
        const items = fs.readdirSync(source);
        for(const item of items) {
            const sourceFilePath = path.join(source, item);
            const targetFilePath = path.join(target, item);
            matcher.match_proto(sourceFilePath, targetFilePath)
        }
    }

} catch (err) {
    logger.error(`Error in preprocessing: ${err}`);
    process.exit(1);
}
logger.info('Done.')