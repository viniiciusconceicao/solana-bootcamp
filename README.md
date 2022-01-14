### Environment Setup
1. Install Rust from https://rustup.rs/
2. Install Solana from https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool

### Build and test for program compiled natively
```
$ cargo build
$ cargo test
```

### Build and test the program compiled for BPF
```
$ cargo build-bpf
$ cargo test-bpf
```

## to run the js do 
```
npm install
npm i mz
npm i fs
npm i @solana/spl-token
```

##Creating Token Acc/ Token 
```
https://spl.solana.com/token
sudo apt-get install libudev-dev
cargo install spl-token-cli
spl-token create-token
spl-token create-account <token address>
spl-token balance <token address>
spl-token mint <token mint> 100
spl-token accounts

```
