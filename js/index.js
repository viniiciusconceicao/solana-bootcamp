
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
const splToken = require("@solana/spl-token");

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
    else if (cmd == "getAuthorizedEchoData") {
	cmd_get_authorized_echo_data(programId, connection, args.slice(3));
    }
    else if (cmd == "vendingMachineEcho") {
	cmd_vending_machine_echo(programId, connection, args.slice(3));
    }
    else {
	console.log("unsupported command:", cmd);
    }
};

async function cmd_vending_machine_echo(programId, connection, args) {
    if (args.length == 0) {
	console.log("missing echo arg");
	return;
    }

    const echo = args[0];
    const price = args[1];

    feePayer = new Keypair();

    if (args.length > 2) {
	secretKeyString = await readFile(args[2], { encoding: "utf8" });
	console.log("loaded keyfile from ", args[2]);
	const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
	feePayer = Keypair.fromSecretKey(secretKey);
    }

    const vendingMachineMintId = new PublicKey("HNe1dgWXucRqEFAJK5pkN5pxY3WtLjmSW6MwAaekrgYD");

    console.log("Requesting Airdrop of 2 SOL...");
    await connection.requestAirdrop(feePayer.publicKey, 2e9);
    console.log("Airdrop received");

    const buffer_price = new Uint8Array((new BN(price)).toArray("le", 8));
    const vendingMachineEchoKey = (await PublicKey.findProgramAddress(
	["vending_machine", vendingMachineMintId.toBuffer(), buffer_price],
	programId
    ))[0];

    const tokenAcctId = new PublicKey("HEvK4rje9b1KWajpBNVmH6paXHWcHyfk6PEzHjEoU4Es");
	const ownerAcc = new PublicKey("13dj7P7LSSqoWvtVqV8akhcdfdhMVbcju6U3hgQKqBuZ");

//Creating token HNe1dgWXucRqEFAJK5pkN5pxY3WtLjmSW6MwAaekrgYD
//Signature: RbSDTt1qnEHJT2MYMkqgRr3PnLFy1nMTK8hag8GhT5GB73ifZk8PeQzUvs7mtZaTxcbjgCZC32JhjRsrEV7MFZQ
//Mint Authority: 13dj7P7LSSqoWvtVqV8akhcdfdhMVbcju6U3hgQKqBuZ

//Creating account HEvK4rje9b1KWajpBNVmH6paXHWcHyfk6PEzHjEoU4Es
//Signature: CBDgf9Ac5zWT6Gs5xZga3AtXd2qi6aTfeaZjcYmttxoWJ9eacYUVudn5YG4JHDwcQ4x4G3ZVhottVwK75vPEYPo
//Token Program ID: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

    let tx = new Transaction();

    let vendingMachineEchoData = await connection.getAccountInfo(vendingMachineEchoKey);
    if (!vendingMachineEchoData) {
	const idx = Buffer.from(new Uint8Array([3]));
	const buffer_size = Buffer.from(new Uint8Array((new BN(123).toArray("le", 8))));
	
	const initIx = new TransactionInstruction({
	    keys: [
		{
		    pubkey: vendingMachineEchoKey,
		    isSigner: false,
		    isWritable: true,
		},
		{
		    pubkey: vendingMachineMintId,
		    isSigner: false,
		    isWritable: false,
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
	    data: Buffer.concat([idx, Buffer.from(buffer_price), buffer_size]),
	    programId: programId,
	});
	tx.add(initIx);
    }
    if(1)
    {
	const idx = Buffer.from(new Uint8Array([4]));
	const messageLen = Buffer.from(new Uint8Array((new BN(echo.length)).toArray("le", 4)));
	const message = Buffer.from(echo, "ascii");
	const echoTx = new TransactionInstruction({
	    keys: [
		{
		    pubkey: vendingMachineEchoKey,
		    isSigner: false,
		    isWritable: true,
		},
		{
		    pubkey: feePayer.publicKey,
		    isSigner: true,
		    isWritable: false,
		},
		{
		    pubkey: tokenAcctId,
		    isSigner: false,
		    isWritable: true,
		},
		{
		    pubkey: vendingMachineMintId,
		    isSigner: false,
		    isWritable: true,
		},
		{
		    pubkey: splToken.TOKEN_PROGRAM_ID,
		    isSigner: false,
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

    data = (await connection.getAccountInfo(vendingMachineEchoKey)).data;
    console.log("Authorized Echo Buffer Text:", data.slice(9).toString());
}

async function cmd_get_authorized_echo_data(programId, connection, args) {
    if (args.length == 0) {
	console.log("missing account keyfile");
	return;
    }

    secretKeyString = await readFile(args[0], { encoding: "utf8" });
    console.log("loaded keyfile from ", args[0]);
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const feePayer = Keypair.fromSecretKey(secretKey);

    const buffer_seed = new Uint8Array((new BN(53243)).toArray("le", 8));
    const authEchoKey = (await PublicKey.findProgramAddress(
	["authority",  feePayer.publicKey.toBuffer(), buffer_seed],
	programId
    ))[0];

    data = (await connection.getAccountInfo(authEchoKey)).data;
    console.log("Authorized Echo Buffer Text:", data.slice(9).toString());
}

async function cmd_authorized_echo(programId, connection, args) {
    if (args.length == 0) {
	console.log("missing echo arg");
	return;
    }

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


    const buffer_seed = new Uint8Array((new BN(53243)).toArray("le", 8));
    //const buffer_size = 100;
    const authEchoKey = (await PublicKey.findProgramAddress(
	["authority",  feePayer.publicKey.toBuffer(), buffer_seed],
	programId
    ))[0];

    let tx = new Transaction();

    let authEchoData = await connection.getAccountInfo(authEchoKey);
    if (!authEchoData) {
	const idx = Buffer.from(new Uint8Array([1]));
	//const xbuffer_seed = Buffer.from(new Uint8Array((new BN(43243)).toArray("le", 8)));
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
	    data: Buffer.concat([idx, Buffer.from(buffer_seed), buffer_size]),
	    programId: programId,
	});
	tx.add(initIx);
    }
    if(1)
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

    data = (await connection.getAccountInfo(authEchoKey)).data;
    console.log("Authorized Echo Buffer Text:", data.slice(9).toString());
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
