import { PublicKey } from "@solana/web3.js"

type Pda = {
    publicKey: PublicKey,
    bump: number
}

export class PdaClient {
    private readonly programId: PublicKey;

    constructor(programId: PublicKey) {
        this.programId = programId;
    }

    realmAccount({name}: {name: string}): Pda {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("governance"), 
            Buffer.from(name)
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    communityTokenHoldingAccount(
        {realmAccount, communityMint} : 
        {realmAccount: PublicKey, communityMint: PublicKey}): Pda 
    {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("governance"), 
            realmAccount.toBuffer(),
            communityMint.toBuffer()
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    councilTokenHoldingAccount(
        {realmAccount, councilMint} : 
        {realmAccount: PublicKey, councilMint: PublicKey}): Pda 
    {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("governance"), 
            realmAccount.toBuffer(),
            councilMint.toBuffer()
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    realmConfigAccount({realmAccount}: {realmAccount: PublicKey}): Pda {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("realm-config"), 
            realmAccount.toBuffer(),  
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    tokenOwnerRecordAccount(
        {realmAccount, governingTokenMint, governingTokenOwner} : 
        {realmAccount: PublicKey, governingTokenMint: PublicKey, governingTokenOwner: PublicKey}): Pda 
    {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("governance"), 
            realmAccount.toBuffer(),
            governingTokenMint.toBuffer(),
            governingTokenOwner.toBuffer()
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    governingTokenHoldingAccount(
        {realmAccount, governingTokenMint} :
        {realmAccount: PublicKey, governingTokenMint: PublicKey}
    ) {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("governance"), 
            realmAccount.toBuffer(),
            governingTokenMint.toBuffer(),
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    governanceAccount(
        {realmAccount, governedAccount} :
        {realmAccount: PublicKey, governedAccount: PublicKey}
    ) {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("account-governance"), 
            realmAccount.toBuffer(),
            governedAccount.toBuffer(),
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    nativeTreasuryAccount(
        {governanceAccount} : {governanceAccount: PublicKey}
    ) {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("native-treasury"), 
            governanceAccount.toBuffer(),
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    proposalAccount(
        {governanceAccount, governingTokenMint, proposalSeed} :
        {governanceAccount: PublicKey, governingTokenMint: PublicKey, proposalSeed: PublicKey}
    ) {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("governance"), 
            governanceAccount.toBuffer(),
            governingTokenMint.toBuffer(),
            proposalSeed.toBuffer()
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }

    proposalDepositAccount(
        {proposal, depositPayer} :
        {proposal: PublicKey, depositPayer: PublicKey}
    ) {
        const pda = PublicKey.findProgramAddressSync([
            Buffer.from("proposal-deposit"), 
            proposal.toBuffer(),
            depositPayer.toBuffer(),
        ],
            this.programId
        )

        return {publicKey: pda[0], bump: pda[1]};
    }
}