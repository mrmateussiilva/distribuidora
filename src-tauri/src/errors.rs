use thiserror::Error;

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Business logic error: {0}")]
    BusinessLogic(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Password hashing error: {0}")]
    PasswordHashing(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

