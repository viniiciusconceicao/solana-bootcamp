/*
Wrote new keypair to echo_account
=======================================================================
pubkey: EayGk6g2NuiEMa4FDHhbWESzn8Vbg5tZmvG6yr7TyLoU
=======================================================================
Save this seed phrase and your BIP39 passphrase to recover your new keypair:
tenant assume retire orient potato blade lock suit east blue eye design
=======================================================================
*/
/*
Wrote new keypair to echo_account-local
====================================================================================
pubkey: CtrxRYUG2S59nWDMoGGrP4WYnvk9QqsHp17YJR15UaXs
====================================================================================
Save this seed phrase and your BIP39 passphrase to recover your new keypair:
manual spirit coconut invest comic seven purchase empty transfer scrub science forum
====================================================================================
*/
const { readFile } = require("mz/fs");
const {
  Connection,
  sendAndConfirmTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} = require("@solana/web3.js");

const BN = require("bn.js");

const main = async () => {
    var args = process.argv.slice(2);
    const programId = new PublicKey(args[0]);
    const env = args[1];
    const cmd = args[2];

    const connection = new Connection(env == "devnet" ? "https://api.devnet.solana.com/" : "http://localhost:8899");

    if (cmd == "echo") {
	cmd_echo(programId, connection, args.slice(3));
    }
    else if (cmd == "authorizedEcho") {
	cmd_authorized_echo(programId, connection, args.slice(3));
    }
    else {
	console.log("unsupported command:", cmd);
    }
};

async function cmd_authorized_echo(programId, connection, args) {
    feePayer = new Keypair();

    if (args.length > 1) {
	secretKeyString = await readFile(args[1], { encoding: "utf8" });
	console.log("loaded keyfile from ", args[1]);
	const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
	feePayer = Keypair.fromSecretKey(secretKey);
    }

    console.log("Requesting Airdrop of 2 SOL...");
    await connection.requestAirdrop(feePayer.publicKey, 2e9);
    console.log("Airdrop received");


    const buffer_seed = Buffer.from(new Uint8Array((new BN(43243)).toArray("le", 8)));
    const authEchoKey = (await PublicKey.findProgramAddress(
	["authority", feePayer.publicKey.toBuffer(), buffer_seed],
	programId
    ))[0];

    let tx = new Transaction();

    let authEchoData = await connection.getAccountInfo(authEchoKey);
    if (!authEchoData) {
	const idx = Buffer.from(new Uint8Array([1]));
	
	const buffer_size = Buffer.from(new Uint8Array((new BN(100).toArray("le", 8))));
	const initIx = new TransactionInstruction({
	    keys: [
		{
		    pubkey: authEchoKey,
		    isSigner: false,
		    isWritable: true,
		},
		{
		    pubkey: feePayer.publicKey,
		    isSigner: true,
		    isWritable: false,
		},
		{
		    pubkey: SystemProgram.programId,
		    isSigner: false,
		    isWritable: false,
		},
	    ],
	    data: Buffer.concat([idx, buffer_seed, buffer_size]),
	    programId: programId,
	});
	tx.add(initIx);
    }

    {
	const echo = args[0];
	const idx = Buffer.from(new Uint8Array([2]));
	const messageLen = Buffer.from(new Uint8Array((new BN(echo.length)).toArray("le", 4)));
	const message = Buffer.from(echo, "ascii");
	const echoTx = new TransactionInstruction({
	    keys: [
		{
		    pubkey: authEchoKey,
		    isSigner: false,
		    isWritable: true,
		},
		{
		    pubkey: feePayer.publicKey,
		    isSigner: true,
		    isWritable: false,
		},
	    ],
	    data: Buffer.concat([idx, messageLen, message]),
	    programId: programId,
	});
	tx.add(echoTx);
    }

    let txid = await sendAndConfirmTransaction(
	connection,
	tx,
	[feePayer],
	{
	    skipPreflight: true,
	    preflightCommitment: "confirmed",
	    confirmation: "confirmed",
	}
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

	const testKey = (await PublicKey.findProgramAddress(
		["authority", feePayer.publicKey.toBuffer(), buffer_seed],
		programId
		))[0];
    data = (await connection.getAccountInfo(testKey)).data;
    console.log("Echo Buffer Text:", data.toString());
}

async function cmd_echo(programId, connection, args) {
    const echo = args[0];

    const feePayer = new Keypair();
    echoBuffer = new Keypair();

    console.log("Requesting Airdrop of 1 SOL..." + feePayer.publicKey);
    await connection.requestAirdrop(feePayer.publicKey, 2e9);
    console.log("Airdrop received " + feePayer.publicKey);
    
    if (args.length > 1) {
	secretKeyString = await readFile(args[1], { encoding: "utf8" });
	console.log("loaded keyfile from ", args[1]);
	const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
	echoBuffer = Keypair.fromSecretKey(secretKey);
	console.log('pk:', echoBuffer.publicKey.toString());
	console.log('sk:', echoBuffer.privateKey);

	echoData = await connection.getAccountInfo(echoBuffer.publicKey);
	if (!echoData) {
	    console.log("no echo buffer account data found...creating");
	    let createIx = SystemProgram.createAccount({
		fromPubkey: feePayer.publicKey,
		newAccountPubkey: echoBuffer.publicKey,
		/** Amount of lamports to transfer to the created account */
		lamports: await connection.getMinimumBalanceForRentExemption(echo.length),
		/** Amount of space in bytes to allocate to the created account */
		space: echo.length,
		/** Public key of the program to assign as the owner of the created account */
		programId: programId,
	    });

	    let tx = new Transaction();
	    tx.add(createIx);
	
	    let txid = await sendAndConfirmTransaction(
		connection,
		tx,
		[feePayer, echoBuffer],
		{
		    skipPreflight: true,
		    preflightCommitment: "confirmed",
		    confirmation: "confirmed",
		}
	    );
	    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
	    return;
	}
	
	console.log("Echo Buffer Text:", echoData.data.toString());

	const idx = Buffer.from(new Uint8Array([0]));
	const messageLen = Buffer.from(new Uint8Array((new BN(echo.length)).toArray("le", 4)));
	const message = Buffer.from(echo, "ascii");
	
	let echoIx = new TransactionInstruction({
	    keys: [
		{
		    pubkey: echoBuffer.publicKey,
		    isSigner: false,
		    isWritable: true,
		},
	    ],
	    programId: programId,
	    data: Buffer.concat([idx, messageLen, message]),
	});

	let tx = new Transaction();
	tx.add(echoIx);
	
	let txid = await sendAndConfirmTransaction(
	    connection,
	    tx,
	    [feePayer],
	    {
		skipPreflight: true,
		preflightCommitment: "confirmed",
		confirmation: "confirmed",
	    }
	);
	console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
    }
    else {
	let createIx = SystemProgram.createAccount({
	    fromPubkey: feePayer.publicKey,
	    newAccountPubkey: echoBuffer.publicKey,
	    /** Amount of lamports to transfer to the created account */
	    lamports: await connection.getMinimumBalanceForRentExemption(echo.length),
	    /** Amount of space in bytes to allocate to the created account */
	    space: echo.length,
	    /** Public key of the program to assign as the owner of the created account */
	    programId: programId,
	});
      
	const idx = Buffer.from(new Uint8Array([0]));
	const messageLen = Buffer.from(new Uint8Array((new BN(echo.length)).toArray("le", 4)));
	const message = Buffer.from(echo, "ascii");
	
	let echoIx = new TransactionInstruction({
	    keys: [
		{
		    pubkey: echoBuffer.publicKey,
		    isSigner: false,
		    isWritable: true,
		},
	    ],
	    programId: programId,
	    data: Buffer.concat([idx, messageLen, message]),
	});

	let tx = new Transaction();
	tx.add(createIx).add(echoIx);
	
	let txid = await sendAndConfirmTransaction(
	    connection,
	    tx,
	    [feePayer, echoBuffer],
	    {
		skipPreflight: true,
		preflightCommitment: "confirmed",
		confirmation: "confirmed",
	    }
	);
	console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
    }
    
    data = (await connection.getAccountInfo(echoBuffer.publicKey)).data;
    console.log("Echo Buffer Text:", data.toString());
}

main()
  .then(() => {
    console.log("Success");
  })
  .catch((e) => {
    console.error(e);
  });
