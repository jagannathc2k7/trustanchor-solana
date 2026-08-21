use anchor_lang::prelude::*;

declare_id!("8Jd8vX4x9TqE8V9ZkL7w5U2a1mF4bC6dE8gH0jK2mN4p");

#[program]
pub mod academic_credentials {
    use super::*;

    pub fn initialize_issuer(ctx: Context<InitializeIssuer>) -> Result<()> {
        let issuer_state = &mut ctx.accounts.issuer_state;
        issuer_state.admin = ctx.accounts.admin.key();
        Ok(())
    }

    pub fn issue_certificate(
        ctx: Context<IssueCertificate>,
        doc_hash: [u8; 32],
        student_pubkey: Pubkey,
        issue_date: i64,
    ) -> Result<()> {
        let cert = &mut ctx.accounts.certificate;
        require!(!cert.is_initialized, ErrorCode::AlreadyIssued);

        cert.issuer = ctx.accounts.admin.key();
        cert.student = student_pubkey;
        cert.doc_hash = doc_hash;
        cert.issue_date = issue_date;
        cert.is_revoked = false;
        cert.is_initialized = true;

        emit!(CertificateIssued {
            doc_hash,
            student: student_pubkey,
            issuer: ctx.accounts.admin.key(),
        });

        Ok(())
    }

    pub fn revoke_certificate(
        ctx: Context<RevokeCertificate>,
        _doc_hash: [u8; 32],
    ) -> Result<()> {
        let cert = &mut ctx.accounts.certificate;
        require!(!cert.is_revoked, ErrorCode::AlreadyRevoked);

        cert.is_revoked = true;

        emit!(CertificateRevoked {
            doc_hash: cert.doc_hash,
            revoker: ctx.accounts.admin.key(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeIssuer<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [b"issuer_state"],
        bump
    )]
    pub issuer_state: Account<'info, IssuerState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(doc_hash: [u8; 32])]
pub struct IssueCertificate<'info> {
    #[account(
        seeds = [b"issuer_state"],
        bump,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub issuer_state: Account<'info, IssuerState>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"certificate", doc_hash.as_ref()],
        bump
    )]
    pub certificate: Account<'info, CertificateAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(doc_hash: [u8; 32])]
pub struct RevokeCertificate<'info> {
    #[account(
        seeds = [b"issuer_state"],
        bump,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub issuer_state: Account<'info, IssuerState>,
    #[account(
        mut,
        seeds = [b"certificate", doc_hash.as_ref()],
        bump
    )]
    pub certificate: Account<'info, CertificateAccount>,
    pub admin: Signer<'info>,
}

#[account]
pub struct IssuerState {
    pub admin: Pubkey,
}

#[account]
pub struct CertificateAccount {
    pub issuer: Pubkey,
    pub student: Pubkey,
    pub doc_hash: [u8; 32],
    pub issue_date: i64,
    pub is_revoked: bool,
    pub is_initialized: bool,
}

#[event]
pub struct CertificateIssued {
    pub doc_hash: [u8; 32],
    pub student: Pubkey,
    pub issuer: Pubkey,
}

#[event]
pub struct CertificateRevoked {
    pub doc_hash: [u8; 32],
    pub revoker: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Signer is not the admin.")]
    Unauthorized,
    #[msg("Certificate hash has already been registered.")]
    AlreadyIssued,
    #[msg("Certificate is already marked as revoked.")]
    AlreadyRevoked,
}