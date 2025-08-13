use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Intern {
    pub id: Option<i64>,  
    pub first_name: String,
    pub last_name: String,
    pub school: String,
    pub department: String,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub contact: String,
    pub email: String,
    pub cv_path: Option<String>,
    pub photo_path: Option<String>,
}
