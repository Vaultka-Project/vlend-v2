#[macro_export]
/// This macro will emit the provided custom program error and log where the error happened,
/// if the condition is not met.
macro_rules! check {
    ($cond:expr, $err:expr) => {
        if !($cond) {
            let error_code: $crate::errors::MarginfiError = $err;
            #[cfg(not(feature = "test-bpf"))]
            anchor_lang::prelude::msg!(
                "Error \"{}\" thrown at {}:{}",
                error_code,
                file!(),
                line!()
            );
            return Err(error_code.into());
        }
    };

    ($cond:expr, $err:expr, $($arg:tt)*) => {
        if !($cond) {
            let error_code: $crate::errors::MarginfiError = $err;
            #[cfg(not(feature = "test-bpf"))]
            anchor_lang::prelude::msg!(
                "Error \"{}\" thrown at {}:{}",
                error_code,
                file!(),
                line!()
            );
            #[cfg(not(feature = "test-bpf"))]
            anchor_lang::prelude::msg!($($arg)*);
            return Err(error_code.into());
        }
    };
}

#[macro_export]
macro_rules! assert_struct_size {
    ($struct: ty, $size: expr) => {
        static_assertions::const_assert_eq!(std::mem::size_of::<$struct>(), $size);
    };
}

#[macro_export]
macro_rules! assert_struct_align {
    ($struct: ty, $align: expr) => {
        static_assertions::const_assert_eq!(std::mem::align_of::<$struct>(), $align);
    };
}

#[macro_export]
macro_rules! user_account_signer_seeds {
    ($user_account:expr) => {
        &[
            $user_account.user.as_ref(),
            $user_account.marginfi_account.as_ref(),
            &(0 as u8).to_le_bytes(),
            b"user_account",
            &[$user_account.bump_seed],
        ]
    };
}