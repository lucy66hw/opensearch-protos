import fs from 'fs'
import YAML from 'yaml'
import path from "path";

export function read_yaml<T = Record<string, any>> (file_path: string, exclude_schema: boolean = false): T {
    const doc = YAML.parse(fs.readFileSync(file_path, 'utf8'))
    if (typeof doc === 'object' && exclude_schema) delete doc.$schema
    return doc
}

export function write_yaml (file_path: string, content: any): void {
    const doc = new YAML.Document(content, null, { aliasDuplicateObjects: false })

    YAML.visit(doc, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Scalar(_, node) {
            if (typeof node.value === 'string') {
                const value = node.value.toLowerCase();
                // Ensure "human" boolean string values are quoted as old YAML parsers might coerce them to boolean true/false
                if (value === 'no' || value === 'yes' || value === 'n' || value === 'y' || value === 'off' || value === 'on') {
                    node.type = 'QUOTE_SINGLE'
                }
            }
        }
    })

    write_text(file_path, doc.toString({
        lineWidth: 0,
        singleQuote: true
    }))
}

export function ensure_parent_dir (file_path: string): void {
    fs.mkdirSync(path.dirname(file_path), { recursive: true })
}

export function write_text (file_path: string, text: string): void {
    ensure_parent_dir(file_path)
    fs.writeFileSync(file_path, text)
}

