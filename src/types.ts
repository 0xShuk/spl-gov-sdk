import { IdlTypes } from "@coral-xyz/anchor";
import { GovernanceIdl } from "./idl/gov_type";

export type MintMaxVoteWeightSource = IdlTypes<GovernanceIdl>["MintMaxVoterWeightSource"];
export type GovernanceConfig = IdlTypes<GovernanceIdl>["GovernanceConfig"];
export type VoteType = IdlTypes<GovernanceIdl>["VoteType"];
