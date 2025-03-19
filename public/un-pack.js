import {extractPack} from "@foundryvtt/foundryvtt-cli";
import {promises as fs} from "fs";
import path from "path";

const yaml = true;
const MODULE_ID = path.join(process.cwd());
const SCRIPT_FILE_PATH = function() {
    const url = import.meta.url;
    const filePath = path.dirname(new URL(url).pathname);
    return process.platform === "win32" ? filePath.replace(/\//, "") : filePath;
}();
console.log(`Unpacking compendia of system ${MODULE_ID}`);
const packs = await fs.readdir("./packs");
for (const pack of packs) {
    if((await fs.stat(`./packs/${pack}`)).isFile()) {
            console.debug(`Omitting file ${pack}`);
    }
    await unpackLdbCompendium(pack);
}


/**
 * @param {string} pack
 * @returns {Promise<void>}
 */
async function unpackLdbCompendium(pack){
    console.log("Unpacking " + pack);
    const directory = `${SCRIPT_FILE_PATH}/../src/packs/${pack}`;
    try {
        for (const file of await fs.readdir(directory)) {
            await fs.unlink(path.join(directory, file));
        }
    } catch (error) {
        if (error.code === "ENOENT") console.log("No files inside of " + pack);
        else console.log(error);
    }
    await extractPack(
        `${MODULE_ID}/packs/${pack}`,
        `${SCRIPT_FILE_PATH}/../src/packs/${pack}`,
        {
            yaml,
            transformName,
        }
    );
}

/**
 * Prefaces the document with its type
 * @param {object} doc - The document data
 */
function transformName(doc) {
    const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, "_");
    const type = doc._key.split("!")[1];
    const prefix = ["actors", "items"].includes(type) ? doc.type : type;

    return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.${
        yaml ? "yml" : "json"
    }`;
}