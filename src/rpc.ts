import { Connection, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

async function broadcastTransaction(
    connection: Connection,
    wallet: any,
    ix: TransactionInstruction
) {
    let latestBlockhash = await connection.getLatestBlockhash()

    const messageLegacy = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [ix],
    }).compileToLegacyMessage();

    const transation = new VersionedTransaction(messageLegacy);

    let signature;
    if (wallet.sendTransaction) {
        signature = await wallet.sendTransaction(transation, connection);

    } else {
        transation.sign([wallet.payer]);
        signature = await connection.sendTransaction(transation);
    }

    await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');

    return signature;    
}

export default broadcastTransaction;