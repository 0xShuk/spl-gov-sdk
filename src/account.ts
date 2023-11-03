import idl from "./idl/gov.json";
import {BorshAccountsCoder} from "@coral-xyz/anchor/dist/cjs/coder/borsh/accounts";
import { GovernanceIdl } from "./idl/gov_type";

const coder = new BorshAccountsCoder(idl as GovernanceIdl);

function deserialize(name: string, data: Buffer) {
    // Prepend 8-byte default discriminator
    const modifiedData = Buffer.concat([Buffer.from("0".repeat(16), "hex"),data]);
    return coder.decodeUnchecked(name, modifiedData)
}

export default deserialize;