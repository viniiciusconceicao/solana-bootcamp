use borsh::BorshDeserialize;
use borsh::BorshSerialize;
/* use solana_program::{
   account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
   pubkey::Pubkey,
}; */

 use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke_signed, invoke},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    system_program::ID as SYSTEM_PROGRAM_ID,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token::ID as TOKEN_PROGRAM_ID;
use crate::error::EchoError;
use crate::instruction::EchoInstruction;
use crate::state::AuthorizedBufferHeader;
use crate::state::VendingMachineBufferHeader;

pub fn assert_with_msg(statement: bool, err: ProgramError, msg: &str) -> ProgramResult {
    if !statement {
        msg!(msg);
        Err(err)
    } else {
        Ok(())
    }
}

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        _accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = EchoInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;
        msg!(  " MY PRINT process_instruction: {}: {} accounts, data={:?}",
                _program_id,
                _accounts.len(),
                instruction_data
            );
        match instruction {
            EchoInstruction::Echo { data: echo_data } => {
                msg!("Instruction: Echo");
                msg!("data={:?}, len={}", echo_data, echo_data.len());
                let accounts_iter = &mut _accounts.iter();
                let echo_ai = solana_program::account_info::next_account_info(accounts_iter)?;

                msg!("acc_len={}", echo_ai.data.borrow().len());
                let mut echo_buffer = echo_ai.data.borrow_mut();
                let mut all_zeros: bool = true;
                
                for byte in echo_buffer.into_iter() {
                    if *byte != 0 {
                        all_zeros = false;
                        break;
                    }
                }
                msg!("checking acc len before trying to coppy");
                if echo_buffer.len() == 0 {
                    msg!("echo account has no data allocated...bombing out!");
                    return Err(EchoError::NotImplemented.into());
                }
                if all_zeros != true {
                    return Err(EchoError::NotImplemented.into());
                }

                for it in  echo_data.iter().zip(echo_buffer.iter_mut()) {
                    let    (ai, bi) = it;
                    *bi = *ai;
                }
                msg!("copy buffer: {:?} size={}", echo_buffer, echo_buffer.len());
                Ok(())
            }
            EchoInstruction::InitializeAuthorizedEcho {
                buffer_seed,
                buffer_size
            } => {
                msg!("Instruction: InitializeAuthorizedEcho");
                //msg!("tried to exec initialize");
                //Ok(())
                let accounts_iter = &mut _accounts.iter();
                let _auth_echo_ai = next_account_info(accounts_iter)?;
                let _authority = next_account_info(accounts_iter)?;
                let _system_program = next_account_info(accounts_iter)?;
                
                msg!("buffer_seed={} buffer_size={}", buffer_seed, buffer_size);
                let (authorized_buffer_key, bump) = Pubkey::find_program_address(
                    &[  // needs to be the same as in the js findProgram
                    b"authority",
                    _authority.key.as_ref(),
                    &buffer_seed.to_le_bytes()],
                    _program_id,
                );
                // invoke: use when no PDAs
                // invoke_signed: use when PDAs sign
                invoke_signed(
                    &system_instruction::create_account(
                        _authority.key,
                        _auth_echo_ai.key,
                        Rent::get()?.minimum_balance(buffer_size),
                        buffer_size.try_into().unwrap(),
                        _program_id,
                    ),
                    &[_authority.clone(), _auth_echo_ai.clone(), _system_program.clone()],
                    &[&[ 
                         b"authority",
                         _authority.key.as_ref(),
                         &buffer_seed.to_le_bytes(),
                          &[bump]]],
                )?;
                assert_with_msg(
                    *_system_program.key == SYSTEM_PROGRAM_ID,
                    ProgramError::InvalidArgument,
                    "Invalid passed in for system program",
                )?;
                assert_with_msg(
                    authorized_buffer_key == *_auth_echo_ai.key,
                    ProgramError::InvalidArgument,
                    "Invalid PDA seeds for echo buffer",
                )?;

                msg!("Created account just fine with seeds");
                msg!("created account for {}, data.len={}, buff_size={}", _auth_echo_ai.key.to_string(),
                     _auth_echo_ai.data.borrow().len(), buffer_size);

                let mut auth_echo = AuthorizedBufferHeader::try_from_slice(&_auth_echo_ai.data.borrow()[0..9])?;
                msg!("Trying to serialize bump={} and buffer_seed={} data for auth_echo account", bump, buffer_seed);
                auth_echo.bump_seed = bump;
                auth_echo.buffer_seed = buffer_seed;
                auth_echo.serialize(&mut *_auth_echo_ai.data.borrow_mut())?;
                msg!("Serializing back worked");
                
                Ok(())
            }
            EchoInstruction::AuthorizedEcho { data: echo_data } => {
                msg!("Instruction: AuthorizedEcho");
                let accounts_iter = &mut _accounts.iter();
                let _auth_echo_ai = next_account_info(accounts_iter)?;
                let _authority = next_account_info(accounts_iter)?;

                assert_with_msg(
                    _authority.is_signer,
                    ProgramError::MissingRequiredSignature,
                    "Authority must sign",
                )?;
                // Deserialize account data (only first 9 bytes)
                let auth_echo = AuthorizedBufferHeader::try_from_slice(&_auth_echo_ai.data.borrow()[0..9])?;
                
                // Validate auth seeds
                let authority_seeds = &[
                     b"authority",
                     _authority.key.as_ref(),
                     &auth_echo.buffer_seed.to_le_bytes(),
                     &[auth_echo.bump_seed]];
                let auth_key = Pubkey::create_program_address(authority_seeds, _program_id)?;

                assert_with_msg(
                    auth_key == *_auth_echo_ai.key,
                    ProgramError::InvalidArgument,
                    "Invalid PDA seeds for authority",
                )?;
                
                let mut auth_echo_buffer = _auth_echo_ai.data.borrow_mut();
                //initialize to 0 initially
                for byte in auth_echo_buffer[9..].iter_mut() {
                    if *byte != 0 {
                        *byte = 0;
                    }
                }                                
                // Copy message bytes after index 9
                for it in  echo_data.iter().zip(auth_echo_buffer[9..].iter_mut()) {
                    let    (ai, bi) = it;
                    *bi = *ai;
                }
                msg!("received buffer: {:?} size={}", echo_data, echo_data.len());
                msg!("copied into buffer: {:?} size={}", auth_echo_buffer, auth_echo_buffer.len());
                Ok(())
            }
            EchoInstruction::InitializeVendingMachineEcho {
                price,
                buffer_size
            } => {
                msg!("Instruction: InitializeVendingMachineEcho");
                let accounts_iter = &mut _accounts.iter();
                let _vending_machine_buffer_ai = next_account_info(accounts_iter)?;
                let _vending_machine_mint = next_account_info(accounts_iter)?;
                let _payer = next_account_info(accounts_iter)?;
                let _system_program = next_account_info(accounts_iter)?;

                assert_with_msg(
                    _payer.is_signer,
                    ProgramError::MissingRequiredSignature,
                    "payer must sign",
                )?;
                                
                msg!("price={} buffer_size={}", price, buffer_size);
                let (vending_machine_buffer_key, bump) = Pubkey::find_program_address(
                    &[
                    b"vending_machine",
                    _vending_machine_mint.key.as_ref(),
                    &price.to_le_bytes()],
                    _program_id,
                );
                // invoke: use when no PDAs
                // invoke_signed: use when PDAs sign
                invoke_signed(
                    &system_instruction::create_account(
                        _payer.key,
                        _vending_machine_buffer_ai.key,
                        Rent::get()?.minimum_balance(buffer_size),
                        buffer_size.try_into().unwrap(),
                        _program_id,
                    ),
                    &[_payer.clone(), _vending_machine_buffer_ai.clone(), _system_program.clone()],
                    &[&[ 
                         b"vending_machine",
                         _vending_machine_mint.key.as_ref(),
                         &price.to_le_bytes(),
                          &[bump]]],
                )?;
                assert_with_msg(
                    *_system_program.key == SYSTEM_PROGRAM_ID,
                    ProgramError::InvalidArgument,
                    "Invalid passed in for system program",
                )?;
                assert_with_msg(
                    vending_machine_buffer_key == *_vending_machine_buffer_ai.key,
                    ProgramError::InvalidArgument,
                    "Invalid PDA seeds for vending machine buffer",
                )?;

                msg!("Created vending buffer just fine with seeds");
                msg!("created vending buffer acc for {}, data.len={}, buff_size={}", _vending_machine_buffer_ai.key.to_string(),
                     _vending_machine_buffer_ai.data.borrow().len(), buffer_size);

                let mut auth_echo = VendingMachineBufferHeader::try_from_slice(&_vending_machine_buffer_ai.data.borrow()[0..9])?;
                msg!("Trying to serialize bump={} and price={} data for auth_echo account", bump, price);
                auth_echo.bump_seed = bump;
                auth_echo.price = price;
                auth_echo.serialize(&mut *_vending_machine_buffer_ai.data.borrow_mut())?;
                msg!("Serializing back worked");
                Ok(())
            }
            EchoInstruction::VendingMachineEcho { data: echo_data } => {
                //Creating token HNe1dgWXucRqEFAJK5pkN5pxY3WtLjmSW6MwAaekrgYD
                //Signature: RbSDTt1qnEHJT2MYMkqgRr3PnLFy1nMTK8hag8GhT5GB73ifZk8PeQzUvs7mtZaTxcbjgCZC32JhjRsrEV7MFZQ
                //Mint Authority: 13dj7P7LSSqoWvtVqV8akhcdfdhMVbcju6U3hgQKqBuZ

                //Creating account HEvK4rje9b1KWajpBNVmH6paXHWcHyfk6PEzHjEoU4Es
                //Signature: CBDgf9Ac5zWT6Gs5xZga3AtXd2qi6aTfeaZjcYmttxoWJ9eacYUVudn5YG4JHDwcQ4x4G3ZVhottVwK75vPEYPo

                //Token Program ID: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

                msg!("Instruction: VendingMachineEcho");
                let accounts_iter = &mut _accounts.iter();
                let _vending_machine_buffer_ai = next_account_info(accounts_iter)?;
                let _user = next_account_info(accounts_iter)?;
                let _user_token_account = next_account_info(accounts_iter)?;
                let _vending_machine_mint = next_account_info(accounts_iter)?;
                let _token_program = next_account_info(accounts_iter)?;

                assert_with_msg(
                    _user.is_signer,
                    ProgramError::MissingRequiredSignature,
                    "user must sign",
                )?;

                // Deserialize vending machine buffer data (only first 9 bytes)
                let _vending_machine_buffer_header = VendingMachineBufferHeader::try_from_slice(&_vending_machine_buffer_ai.data.borrow()[0..9])?;
                
                // Validate auth seeds
                let authority_seeds = &[
                    b"vending_machine",
                     _vending_machine_mint.key.as_ref(),
                     &_vending_machine_buffer_header.price.to_le_bytes(),
                     &[_vending_machine_buffer_header.bump_seed]];
                let auth_key = Pubkey::create_program_address(authority_seeds, _program_id)?;
                
                assert_with_msg(
                    *_token_program.key == TOKEN_PROGRAM_ID,
                    ProgramError::InvalidArgument,
                    "Invalid passed in for system program",
                )?;
                assert_with_msg(
                    auth_key == *_vending_machine_buffer_ai.key,
                    ProgramError::InvalidArgument,
                    "Invalid PDA seeds for vending machine buffer",
                )?;


                //Burn tokens from the user token acccount
                msg!("Trying to burn token_program={} user_token_acc={} mint={} user={} price={}",
                       _token_program.key, _user_token_account.key, _vending_machine_mint.key, _user.key,
                       _vending_machine_buffer_header.price); 

                invoke(
                    &spl_token::instruction::burn(
                        &_token_program.key, 
                        &_user_token_account.key, 
                        &_vending_machine_mint.key, 
                        &_user.key, 
                        &[/*&_user.key*/], // saw something on discord that we should remove this
                        _vending_machine_buffer_header.price)?,
                    &[ _token_program.clone(), _user_token_account.clone(), _vending_machine_mint.clone(), _user.clone() ]
                )?;
                               
                let mut vending_machine_buffer = _vending_machine_buffer_ai.data.borrow_mut();
                //initialize to 0 initially
                for byte in vending_machine_buffer[9..].iter_mut() {
                    if *byte != 0 {
                        *byte = 0;
                    }
                }                                
                // Copy message bytes after index 9
                for it in  echo_data.iter().zip(vending_machine_buffer[9..].iter_mut()) {
                    let    (ai, bi) = it;
                    *bi = *ai;
                }
                msg!("received buffer: {:?} size={}", echo_data, echo_data.len());
                msg!("copied into buffer: {:?} size={}", vending_machine_buffer, vending_machine_buffer.len());

                Ok(())
            }
        }
    }
}
