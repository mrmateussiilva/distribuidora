use crate::models::SafeUser;
use std::sync::Mutex;

#[derive(Default)]
pub struct AuthState {
    pub user: Mutex<Option<SafeUser>>,
}
