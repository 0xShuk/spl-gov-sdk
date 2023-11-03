import {PublicKey, Connection, TransactionInstruction, Keypair, SystemProgram} from "@solana/web3.js";
import {Program, Wallet, AnchorProvider, BN} from "@coral-xyz/anchor";
import {DEFAULT_PROGRAM_ID, DEFAULT_PROGRAM_VERSION} from "./constant";
import {GovernanceIdl} from "./idl/gov_type";
import govIdl from "./idl/gov.json";
import {GovernanceConfig, MintMaxVoteWeightSource, VoteType} from "./types";
import { PdaClient } from "./pda";
import ixBuilder from "./ix_builder";
import broadcastTransaction from "./rpc";
import deserialize from "./account";

class Governance {
    readonly programId: PublicKey;
    readonly connection: Connection;
    readonly wallet: Wallet;
    readonly programVersion: number;
    readonly governance: Program<GovernanceIdl>;
    private readonly provider: AnchorProvider;
    
    constructor(
        connection: Connection,
        wallet: Wallet,
        programId?: PublicKey,
        programVersion?: number
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.programId = programId ?? DEFAULT_PROGRAM_ID;
        this.programVersion = programVersion ?? DEFAULT_PROGRAM_VERSION;
        this.provider = new AnchorProvider(this.connection, this.wallet, {commitment: "confirmed"});
        this.governance = new Program<GovernanceIdl>(govIdl as GovernanceIdl, this.programId, this.provider);
    }

    // PDA Client
    getPda() {
        return new PdaClient(this.programId);
    }

    // Instruction Builder
    private buildIx(ix: TransactionInstruction, ixName: string) {
        return ixBuilder(ix, ixName, this.governance);
    }

    // RPC Builder
    private async sendTx(ix: TransactionInstruction) {
        const signature = await broadcastTransaction(
            this.connection, this.wallet, ix
        );
        console.log(signature);
        return signature;
    }

    // Fetch methods
    async getRealm(realmAccount: PublicKey) {
        const account = await this.governance.account.realmV2.getAccountInfo(realmAccount);
        if (!account) {
            throw Error("Couldn't find the account.");
        }
        return deserialize('realmV2', account.data);
    }

    // Build methods
    async buildCreateRealmInstruction(
        name: string, 
        communityTokenMint: PublicKey,
        minTokensToCreateGovernance: BN,
        communityMintMaxVoterWeightSource?: MintMaxVoteWeightSource,
        councilTokenMint?: PublicKey,
        communityTokenType?: "liquid" | "membership" | "dormant",
        councilTokenType?: "liquid" | "membership" | "dormant",
        communityVoterWeightAddinProgramId?: PublicKey,
        maxCommunityVoterWeightAddinProgramId?: PublicKey,
        councilVoterWeightAddinProgramId?: PublicKey,
        maxCouncilVoterWeightAddinProgramId?: PublicKey
    ) {
        const commuintyGoverningTokenType = communityTokenType === "liquid" ? { liquid: {}}
        : communityTokenType === "membership" ? { membership: {}}
        : communityTokenType === "dormant" ? { dormant: {}}
        : {liquid: {}}

        const councilGoverningTokenType = councilTokenType === "liquid" ? { liquid: {}}
        : communityTokenType === "membership" ? { membership: {}}
        : communityTokenType === "dormant" ? { dormant: {}}
        : {membership: {}}

        const realmAccount = this.getPda().realmAccount({name}).publicKey

        const communityTokenHoldingAccount = this.getPda().communityTokenHoldingAccount({
            realmAccount: realmAccount, 
            communityMint: communityTokenMint
        }).publicKey

        const councilTokenHoldingAccount = councilTokenMint ? 
            this.getPda().councilTokenHoldingAccount({
                realmAccount: realmAccount, 
                councilMint: councilTokenMint ? councilTokenMint : communityTokenMint
            }).publicKey
        :   null;

        const realmConfigAccount = this.getPda().realmConfigAccount({realmAccount}).publicKey

        const communityMintMaxVoterWeightSourceUpdated = communityMintMaxVoterWeightSource ?? 
            {
                supplyFraction: [new BN(Math.pow(10,10))]
            }

        const defaultIx = await this.governance.methods.createRealm(name, {
            useCouncilMint: councilTokenMint !== undefined,
            minCommunityWeightToCreateGovernance: minTokensToCreateGovernance,
            communityMintMaxVoterWeightSource: communityMintMaxVoterWeightSourceUpdated,
            communityTokenConfigArgs: {
                useVoterWeightAddin: communityVoterWeightAddinProgramId !== undefined,
                useMaxVoterWeightAddin: maxCommunityVoterWeightAddinProgramId !== undefined,
                tokenType: commuintyGoverningTokenType
            },
            councilTokenConfigArgs: {
                useVoterWeightAddin: councilVoterWeightAddinProgramId !== undefined,
                useMaxVoterWeightAddin: maxCouncilVoterWeightAddinProgramId !== undefined,
                tokenType: councilGoverningTokenType
            }
        }).accounts({
            realmAccount,
            realmAuthority: this.provider.publicKey,
            communityTokenMint,
            communityTokenHoldingAccount,
            councilTokenMint: councilTokenMint ?? null,
            councilTokenHoldingAccount,
            realmConfig: realmConfigAccount,
            communityVoterWeightAddin: communityVoterWeightAddinProgramId ?? null,
            maxCommunityVoterWeightAddin: maxCommunityVoterWeightAddinProgramId ?? null,
            councilVoterWeightAddin: councilVoterWeightAddinProgramId ?? null,
            maxCouncilVoterWeightAddin: maxCouncilVoterWeightAddinProgramId ?? null
        }).instruction();

        return this.buildIx(defaultIx, "createRealm");
    }

    async createRealm(
        name: string, 
        communityTokenMint: PublicKey,
        minTokensToCreateGovernance: BN,
        communityMintMaxVoterWeightSource?: MintMaxVoteWeightSource,
        councilTokenMint?: PublicKey,
        communityTokenType?: "liquid" | "membership" | "dormant",
        councilTokenType?: "liquid" | "membership" | "dormant",
        communityVoterWeightAddinProgramId?: PublicKey,
        maxCommunityVoterWeightAddinProgramId?: PublicKey,
        councilVoterWeightAddinProgramId?: PublicKey,
        maxCouncilVoterWeightAddinProgramId?: PublicKey
    ) {
        
        const ix = await this.buildCreateRealmInstruction(name,communityTokenMint, minTokensToCreateGovernance,
            communityMintMaxVoterWeightSource, councilTokenMint, communityTokenType, councilTokenType,
            communityVoterWeightAddinProgramId, maxCommunityVoterWeightAddinProgramId, councilVoterWeightAddinProgramId,
            maxCouncilVoterWeightAddinProgramId
        );
        
        await this.sendTx(ix);
        return ix.keys[0].pubkey
    }

    async buildCreateTokenOwnerRecordInstruction(
        realmAccount: PublicKey,
        governingTokenMint: PublicKey,
        governingTokenOwner?: PublicKey
    ) {
        const owner = governingTokenOwner ?? this.provider.publicKey;

        const tokenOwnerRecord = this.getPda().tokenOwnerRecordAccount(
            {realmAccount, governingTokenMint, governingTokenOwner: owner}
        ).publicKey

        const defaultIx = await this.governance.methods.createTokenOwnerRecord()
        .accounts({
            realmAccount,
            governingTokenMint,
            governingTokenOwnerAccount: owner,
            tokenOwnerRecord
        })
        .instruction();

        return this.buildIx(defaultIx, "createTokenOwnerRecord");
    }

    async createTokenOwnerRecord(
        realmAccount: PublicKey,
        governingTokenMint: PublicKey,
        governingTokenOwner?: PublicKey
    ) {
        const ix = await this.buildCreateTokenOwnerRecordInstruction(realmAccount, governingTokenMint, governingTokenOwner);
        await this.sendTx(ix);
        return ix.keys[2].pubkey
    }

    async buildDepositGoverningTokensInstruction(
        realmAccount: PublicKey,
        governingTokenMint: PublicKey,
        governingTokenSource: PublicKey,
        governingTokenOwner: PublicKey,
        governingTokenSourceAuthority: PublicKey,
        amount: BN
    ) {
        const governingTokenHoldingAccount = this.getPda().governingTokenHoldingAccount({
            realmAccount, governingTokenMint
        }).publicKey

        const tokenOwnerRecord = this.getPda().tokenOwnerRecordAccount(
            {realmAccount, governingTokenMint, governingTokenOwner}
        ).publicKey

        const realmConfig = this.getPda().realmConfigAccount({realmAccount}).publicKey

        const defaultIx = await this.governance.methods.depositGoverningTokens(amount)
        .accounts({
            realmAccount,
            governingTokenHoldingAccount,
            governingTokenOwnerAccount: governingTokenOwner,
            governingTokenSourceAccount: governingTokenSource,
            governingTokenSourceAccountAuthority: governingTokenSourceAuthority,
            realmConfigAccount: realmConfig,
            tokenOwnerRecord
        })
        .instruction();

        return this.buildIx(defaultIx, "depositGoverningTokens");
    }

    async depositGoverningTokens(
        realmAccount: PublicKey,
        governingTokenMint: PublicKey,
        governingTokenSource: PublicKey,
        governingTokenOwner: PublicKey,
        governingTokenSourceAuthority: PublicKey,
        amount: BN
    ) {
        const ix = await this.buildDepositGoverningTokensInstruction(
            realmAccount, governingTokenMint, governingTokenSource, governingTokenOwner,
            governingTokenSourceAuthority, amount
        );
        await this.sendTx(ix);
        return ix.keys[1].pubkey
    }

    async buildCreateGovernanceInstruction(
        config: GovernanceConfig,
        realmAccount: PublicKey,
        createAuthority: PublicKey,
        governedAccount?: PublicKey,
        tokenOwnerRecord?: PublicKey,
        voterWeightRecord?: PublicKey
    ) {

        const governanceAccountSeed = governedAccount ?? Keypair.generate().publicKey;

        const governanceAccount = this.getPda().governanceAccount({
            realmAccount, governedAccount: governanceAccountSeed
        }).publicKey

        const realmConfig = this.getPda().realmConfigAccount({realmAccount}).publicKey

        const defaultIx = await this.governance.methods.createGovernance(config)
        .accounts({
            realmAccount,
            governanceAccount,
            governedAccount: governanceAccountSeed,
            governingTokenOwnerRecord: tokenOwnerRecord ?? SystemProgram.programId,
            realmConfigAccount: realmConfig,
            voterWeightRecord: voterWeightRecord ?? null,
            governanceAuthority: createAuthority
        })
        .instruction();

        return this.buildIx(defaultIx, "createGovernance");
    }

    async createGovernance(
        config: GovernanceConfig,
        realmAccount: PublicKey,
        createAuthority: PublicKey,
        governedAccount?: PublicKey,
        tokenOwnerRecord?: PublicKey,
        voterWeightRecord?: PublicKey
    ) {
        const ix = await this.buildCreateGovernanceInstruction(config, realmAccount, createAuthority, governedAccount,
        tokenOwnerRecord, voterWeightRecord);
        await this.sendTx(ix);
        return ix.keys[1].pubkey
    }

    async buildCreateNativeTreasuryInstruction(governanceAccount: PublicKey) {
        const defaultIx = await this.governance.methods.createNativeTreasury()
        .accounts({
            governanceAccount,
            nativeTreasuryAccount: this.getPda().nativeTreasuryAccount({governanceAccount}).publicKey
        })
        .instruction();
        return this.buildIx(defaultIx, "createNativeTreasury");
    }

    async createNativeTreasury(governanceAccount: PublicKey) {
        const ix = await this.buildCreateNativeTreasuryInstruction(governanceAccount);
        await this.sendTx(ix);
        return ix.keys[1].pubkey
    }

    async buildSetRealmAuthorityInstruction(
        realmAccount: PublicKey,
        newRealmAuthority: PublicKey,
        action: 'SetUnchecked' | 'SetChecked' | 'Remove'
    ) {

        const actionEnum = action === "SetUnchecked" ? { setUnchecked: {}}
        : action === "SetChecked" ? { setChecked: {}}
        : action === "Remove" ? { remove: {}}
        : {setChecked: {}}

        const defaultIx = await this.governance.methods.setRealmAuthority(actionEnum)
        .accounts({
            realmAccount,
            newRealmAuthority
        })
        .instruction();
        return this.buildIx(defaultIx, "setRealmAuthority");
    }

    async setRealmAuthority(
        realmAccount: PublicKey,
        newRealmAuthority: PublicKey,
        action: 'SetUnchecked' | 'SetChecked' | 'Remove'
    ) {
        const ix = await this.buildSetRealmAuthorityInstruction(realmAccount, newRealmAuthority, action);
        await this.sendTx(ix);
        return ix.keys[2].pubkey
    }

    async buildCreateProposalInstruction(
        name: string,
        descriptionLink: string,
        voteType: VoteType,
        options: [string],
        useDenyOption: boolean,
        realmAccount: PublicKey,
        governanceAccount: PublicKey,
        tokenOwnerRecord: PublicKey,
        governingTokenMint: PublicKey,
        governanceAuthority: PublicKey,
        voterWeightRecord?: PublicKey
    ) {
        const proposalSeed = Keypair.generate().publicKey
        const proposalAccount = this.getPda().proposalAccount({governanceAccount, governingTokenMint, proposalSeed}).publicKey
        const realmConfig = this.getPda().realmConfigAccount({realmAccount}).publicKey
        const proposalDepositAccount = this.getPda().proposalDepositAccount({
            proposal: proposalAccount, depositPayer: this.provider.publicKey
        }).publicKey

        const defaultIx = await this.governance.methods.createProposal(
            name,
            descriptionLink,
            voteType,
            options,
            useDenyOption,
            proposalSeed
        )
        .accounts({
            realmAccount,
            proposalAccount,
            governanceAccount,
            tokenOwnerRecord,
            governingTokenMint,
            governanceAuthority,
            voterWeightRecord: voterWeightRecord ?? null,
            realmConfig,
            proposalDepositAccount
        })
        .instruction();
        return this.buildIx(defaultIx, "createProposal");
    }

    async createProposal(
        name: string,
        descriptionLink: string,
        voteType: VoteType,
        options: [string],
        useDenyOption: boolean,
        realmAccount: PublicKey,
        governanceAccount: PublicKey,
        tokenOwnerRecord: PublicKey,
        governingTokenMint: PublicKey,
        governanceAuthority: PublicKey,
        voterWeightRecord?: PublicKey
    ) {
        const ix = await this.buildCreateProposalInstruction(
            name, descriptionLink, voteType, options, useDenyOption, realmAccount, governanceAccount,
            tokenOwnerRecord, governingTokenMint, governanceAuthority, voterWeightRecord
        );
        await this.sendTx(ix);
        return ix.keys[1].pubkey
    }
}

export * from "./constant";
export * from "./types";
export default Governance;