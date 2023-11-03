import Governance, { GovernanceConfig } from "../src";
import {BN, Wallet} from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as token from "@solana/spl-token";
import secret from "../../sol/id.json";

// Connection and Wallet instances
const connection = new Connection(clusterApiUrl('devnet'), "confirmed");
// const keypair = Keypair.generate();
const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
const wallet = new Wallet(keypair);

// Setup the Governance instance
const governance = new Governance(connection,wallet);

(async() => {
    // Load the wallet - Airdrop not working, using the default keypair
    // const tx = await connection.requestAirdrop(keypair.publicKey, 1 * LAMPORTS_PER_SOL);
    // console.log("1 SOL is airdropped to ", keypair.publicKey.toBase58());

    // Create Realm - 1. with default params and no council
    const communityMint1 = await token.createMint(connection, keypair, keypair.publicKey, keypair.publicKey, 6);
    const realmAddress1 = await governance.createRealm("SDK TEST ##13", communityMint1, new BN(1000000));
    console.log("Realm 1 created, ", realmAddress1.toBase58());

    // Create Realm - 2. with custom params and council
    const communityMint2 = await token.createMint(connection, keypair, keypair.publicKey, keypair.publicKey, 6);
    const councilMint2 = await token.createMint(connection, keypair, keypair.publicKey, keypair.publicKey, 6);
    const realmAddress2 = await governance.createRealm(
        "SDK TEST ##14", 
        communityMint2, 
        new BN(1000000),
        {absolute: [new BN(5000000)]},
        councilMint2,
        "liquid",
        "membership"
    );
    console.log("Realm 2 created, ", realmAddress2.toBase58());
    
    // Display On-chain Realm Account
    const realmAccountData = await governance.getRealm(realmAddress2);
    console.log("The on-chain data: ", realmAccountData);

    // Create Token Owner Record
    const realmAddress = governance.getPda().realmAccount({name: "SDK TEST ##14"}).publicKey
    const tokenOwnerRecord = await governance.createTokenOwnerRecord(realmAddress, communityMint2, keypair.publicKey);
    console.log("Token Owner Record created, ", tokenOwnerRecord.toBase58());

    // Deposit Governing Token - 7 tokens
    const governingTokenHoldingAccount = await governance.depositGoverningTokens(
        realmAddress,
        communityMint2,
        communityMint2,
        keypair.publicKey,
        keypair.publicKey,
        new BN(7000000)
    );
    console.log("Governing Token Holding Account created, ", governingTokenHoldingAccount.toBase58());

    // Create Governance
    const config: GovernanceConfig = {
        communityVoteThreshold: { yesVotePercentage: [60]},
        minCommunityWeightToCreateProposal: new BN(4000),
        minTransactionHoldUpTime: 0,
        votingBaseTime: 21600,
        communityVoteTipping: {disabled: {}},
        councilVetoVoteThreshold: {yesVotePercentage: [40]},
        councilVoteThreshold: {yesVotePercentage: [40]},
        minCouncilWeightToCreateProposal: new BN(1000000),
        councilVoteTipping: {strict: {}},
        communityVetoVoteThreshold: {disabled: {}},
        votingCoolOffTime: 43200,
        depositExemptProposalCount: 10
    }
    const governanceAccount = await governance.createGovernance(config, realmAddress, keypair.publicKey);
    console.log("Governance Account created, ", governanceAccount.toBase58());

    // Create Native Treasury Account
    const nativeTreasuryAccount = await governance.createNativeTreasury(governanceAccount);
    console.log("Native Treasury created, ", nativeTreasuryAccount.toBase58());

    // Set Realm Authority
    const newAuthority = await governance.setRealmAuthority(realmAddress, governanceAccount, "SetChecked");
    console.log("Realm's authority set to ", newAuthority.toBase58());

    // Create Proposal
    const proposal = await governance.createProposal(
        "Is SPL Governance the best Solana Program?",
        "N/A",
        {singleChoice: {}},
        ["Yes"],
        true,
        realmAddress,
        governanceAccount,
        tokenOwnerRecord,
        communityMint2,
        keypair.publicKey
    )
    console.log("The proposal is created, ", proposal.toBase58());
})()