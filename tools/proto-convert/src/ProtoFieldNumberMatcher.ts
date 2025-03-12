import { format } from "util";
import * as path from "path";
import * as protobuf from "protobufjs";
import * as fs from "fs"
import Logger from './utils/logger';
import {write_text} from "./utils/helper";

const MESSAGE_FIELD_TEMPLATE = "%s_%s";
const map = new Map<string, number>();

export class ProtoFieldNumberMatcher {
    logger: Logger
    constructor(logger: Logger = new Logger()) {
        this.logger = logger
    }

    public match_proto(proto_source: string, proto_target: string): void {
        this.loadSourceProtoSchema(proto_source)
        this.loadTargetSchema(proto_target)
        this.write_replace_file(proto_target)
    }
    loadSourceProtoSchema(filePath: string) {
        // Load and parse the .proto file
        const protoContent = fs.readFileSync(filePath, "utf-8");
        const root = protobuf.parse(protoContent, { keepCase: true }).root;
        this.traverseSourceAndSave(root)
    }

    loadTargetSchema(filePath: string) {
        // Load and parse the .proto file
        const protoContent = fs.readFileSync(filePath, "utf-8");
        const root = protobuf.parse(protoContent, { keepCase: true }).root;
        this.traverseTargetAndMapping(root)
        return root
    }
    getMaxFieldId (type: protobuf.Type): number {
        let max = 0
        for (const [fieldName, field] of Object.entries(type.fields)) {
            if(field.id > max){
                max = field.id
            }
        }
        return max
    }
    getMaxFieldIdEnum (type: protobuf.Enum): number {
        let max = 0
        for (const [fieldName, field] of Object.entries(type.values)) {
            if(field > max){
                max = field
            }
        }
        return max
    }

    traverseTargetAndMapping(namespace: protobuf.NamespaceBase) {
        if (!namespace.nested) return;

        for (const [name, definition] of Object.entries(namespace.nested)) {
            const fullName = `${name}`;
            if(fullName.startsWith("google")) continue
            if (definition instanceof protobuf.Type) {
                var max = this.getMaxFieldId(definition)
                for (const [fieldName, field] of Object.entries(definition.fields)) {
                    const messageFieldName = format(MESSAGE_FIELD_TEMPLATE, fullName, fieldName);
                    if(!map.has(messageFieldName)){
                        map.set(messageFieldName, max++)
                        this.logger.info(`Mapping ${messageFieldName} to ${max}`)
                    }
                }
            } else if (definition instanceof protobuf.Enum) {
                var max = this.getMaxFieldIdEnum(definition)
                for(let [fieldName, field] of Object.entries(definition.values)){
                    const messageFieldName = format(MESSAGE_FIELD_TEMPLATE, fullName, fieldName);
                    if(!map.has(messageFieldName)){
                        map.set(messageFieldName, max++)
                    }
                }
            } else if (definition instanceof protobuf.Namespace) {
                this.traverseTargetAndMapping(definition);
            } else {
                this.logger.warn(`Unknown Definition: ${fullName}`);
            }
        }
    }

    traverseSourceAndSave(namespace: protobuf.NamespaceBase) {
        if (!namespace.nested) return;

        for (const [name, definition] of Object.entries(namespace.nested)) {
            const fullName = `${name}`;
            if(fullName.startsWith("google")) continue
            if (definition instanceof protobuf.Type) {
                for (const [fieldName, field] of Object.entries(definition.fields)) {
                    const messageFieldName = format(MESSAGE_FIELD_TEMPLATE, fullName, fieldName);
                    map.set(messageFieldName, field.id)
                }
            } else if (definition instanceof protobuf.Enum) {
                for(const [fieldName, field] of Object.entries(definition.values)){
                    const messageFieldName = format(MESSAGE_FIELD_TEMPLATE, fullName, fieldName);
                    map.set(messageFieldName, field)
                }
            } else if (definition instanceof protobuf.Namespace) {
                this.traverseSourceAndSave(definition);
            } else {
                this.logger.info(`Unknown Definition: ${fullName}`);
            }
        }
    }
    write_replace_file(filePath: string): void {
        const protoContent = fs.readFileSync(filePath, 'utf-8');
        const messageRegex = /message\s+(\w+)\s*{([^}]*)}/g;
        const fieldRegex = /\s*(\w+)\s+(\w+)\s*=\s*(\d+);/g;

        let match;
        let modifiedContent = protoContent;

        while ((match = messageRegex.exec(protoContent)) !== null) {
            const messageName = match[1];
            const messageBody = match[2];
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(messageBody)) !== null) {
                const fieldType = fieldMatch[1];
                const fieldName = fieldMatch[2];
                const fieldNumber = parseInt(fieldMatch[3], 10);

                const uniqueKey = `${messageName}_${fieldName}`;
                var newFieldNumber = 10000
                if (map.has(uniqueKey) && map.get(uniqueKey) !== undefined) {
                    newFieldNumber = map.get(uniqueKey) ?? newFieldNumber;
                    console.log(`Updating ${uniqueKey}: ${fieldNumber} -> ${newFieldNumber}`);
                }
                modifiedContent = modifiedContent.replace(
                    new RegExp(`(\\s*${fieldType}\\s+${fieldName}\\s*=\\s*)${fieldNumber}(\\s*;)`, "g"),
                    `$1${newFieldNumber}$2`
                );
            }
        }

        write_text('modified.proto', modifiedContent);
        this.logger.info('Modified proto file saved as modified.proto');
    }
}

