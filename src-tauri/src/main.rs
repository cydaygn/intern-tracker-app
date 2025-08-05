#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Builder, generate_context, Emitter};  
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Deserialize, Serialize, Clone)]
struct Stajyer {
    ad: String,
    soyad: String,
    okul: String,
    bolum: String,
    #[serde(rename = "baslangicTarihi")]
    baslangic_tarihi: String,
    #[serde(rename = "bitisTarihi")]
    bitis_tarihi: Option<String>,
    durum: String,
    iletisim: String,
    eposta: String,
}

#[derive(Debug, Serialize)]
struct Response<T> {
    message: String,
    success: bool,
    data: Option<T>,
}

struct AppState {
    stajyerler: Mutex<Vec<Stajyer>>,
}

#[tauri::command]
async fn stajyer_ekle(
    stajyer: Stajyer,
    state: tauri::State<'_, Arc<AppState>>,
    app_handle: tauri::AppHandle,
) -> Result<Response<Stajyer>, String> {
    let mut liste = state.stajyerler.lock()
        .map_err(|e| format!("Lock hatası: {}", e))?;
    
    liste.push(stajyer.clone());

    app_handle.emit("stajyer_eklendi", stajyer.clone())
        .map_err(|e| format!("Event gönderilemedi: {}", e))?;

    Ok(Response {
        message: "Stajyer başarıyla eklendi".to_string(),
        success: true,
        data: Some(stajyer),
    })
}
#[tauri::command]
async fn get_stajyerler(state: tauri::State<'_, Arc<AppState>>) -> Result<Response<Vec<Stajyer>>, String> {
    let liste = state.stajyerler.lock().unwrap();
    Ok(Response {
        message: "Tüm stajyerler listelendi".to_string(),
        success: true,
        data: Some(liste.clone()),
    })
}
#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}
fn main() {
    let state = Arc::new(AppState {
        stajyerler: Mutex::new(vec![]),
    });

    Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![stajyer_ekle, get_stajyerler,read_binary_file])
        .setup(|_app| {
            println!(" Tauri başlatıldı!");
            Ok(())
        })
        .run(generate_context!())
        .expect(" Tauri başlatılamadı");
}