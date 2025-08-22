#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};
use rusqlite::{params, Connection};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog;
use tauri_plugin_fs;

#[derive(Debug, Serialize, Deserialize)]
struct InternLite {
    id: Option<i64>,
    first_name: String,
    last_name: String,
    school: String,
    department: String,
    start_date: String,
    end_date: Option<String>,
    status: String,
    contact: String,
    email: String,
    // sadece meta (liste görünümü)
    cv_name: Option<String>,
    photo_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct InternPayload {
    id: Option<i64>,
    first_name: String,
    last_name: String,
    school: String,
    department: String,
    start_date: String,
    end_date: Option<String>,
    status: String,
    contact: String,
    email: String,

    // disk yolu (varsa)
    cv_path: Option<String>,
    photo_path: Option<String>,

    // BLOB meta + veri (gönderilirse diske yazacağız)
    cv_name: Option<String>,
    cv_mime: Option<String>,
    cv_blob: Option<Vec<u8>>,
    photo_name: Option<String>,
    photo_mime: Option<String>,
    photo_blob: Option<Vec<u8>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Assignment {
    id: Option<i64>,
    intern_id: i64,
    project_type: String,
    task_description: String,
    due_date: String,
    status: String,
    file_path: Option<String>,
    created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Evaluation {
    id: Option<i64>,
    intern_id: i64,
    #[serde(rename = "etiket")]
    label: String,
    #[serde(rename = "puan")]
    score: i64,
    created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct InternFiles {
    cv_name: Option<String>,
    cv_mime: Option<String>,
    cv_blob: Option<Vec<u8>>,
    photo_name: Option<String>,
    photo_mime: Option<String>,
    photo_blob: Option<Vec<u8>>,
    cv_path: Option<String>,
    photo_path: Option<String>,
}

// --- MIGRATIONS (opsiyonel; plugin kullananlar için) ---

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_intern_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS interns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    school TEXT NOT NULL,
                    department TEXT NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT,
                    status TEXT NOT NULL,
                    contact TEXT NOT NULL,
                    email TEXT NOT NULL,
                    cv_path TEXT,
                    photo_path TEXT
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_basic_indexes",
            sql: r#"
                CREATE INDEX IF NOT EXISTS idx_interns_name
                ON interns(first_name, last_name);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_assignments_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS assignments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intern_id INTEGER NOT NULL,
                    project_type TEXT NOT NULL,
                    task_description TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    status TEXT NOT NULL,
                    file_path TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_assignments_intern ON assignments(intern_id);
                CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_evaluations_table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intern_id INTEGER NOT NULL,
                    label TEXT NOT NULL,
                    score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_eval_intern ON evaluations(intern_id);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_blob_columns_for_files",
            sql: r#"
                ALTER TABLE interns ADD COLUMN cv_name     TEXT;
                ALTER TABLE interns ADD COLUMN cv_mime     TEXT;
                ALTER TABLE interns ADD COLUMN cv_blob     BLOB;
                ALTER TABLE interns ADD COLUMN photo_name  TEXT;
                ALTER TABLE interns ADD COLUMN photo_mime  TEXT;
                ALTER TABLE interns ADD COLUMN photo_blob  BLOB;
            "#,
            kind: MigrationKind::Up,
        },
    ]
}

// --- PATH & DB ---

fn app_db_path(handle: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir alınamadı: {e}"))?;
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("app_data_dir oluşturulamadı: {e}"))?;
    Ok(app_dir.join("interns.db"))
}

// MASAÜSTÜ kökü: Desktop\InternTracker\{CV,interns}
fn storage_root(handle: &AppHandle) -> Result<PathBuf, String> {
    let desktop = handle.path().desktop_dir().map_err(|e| e.to_string())?;
    let root = desktop.join("InternTracker");
    fs::create_dir_all(root.join("interns")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("CV")).map_err(|e| e.to_string())?;
    Ok(root)
}

// Türkçe karakterleri sadeleştirerek klasör adı üret
fn slug_tr(s: &str) -> String {
    let mut out = String::new();
    for ch in s.chars() {
        let x = match ch {
            'ç' | 'Ç' => 'c',
            'ğ' | 'Ğ' => 'g',
            'ı' | 'I' | 'İ' => 'i',
            'ö' | 'Ö' => 'o',
            'ş' | 'Ş' => 's',
            'ü' | 'Ü' => 'u',
            _ => ch.to_ascii_lowercase(),
        };
        if x.is_ascii_alphanumeric() { out.push(x); }
        else if x == ' ' || x == '-' || x == '_' { out.push('_'); }
        else { out.push('_'); }
    }
    while out.ends_with('_') { out.pop(); }
    while out.starts_with('_') { out.remove(0); }
    out
}

// interns\{ID}_{ad}_{soyad}
fn person_dir(handle: &AppHandle, id: i64, first: &str, last: &str) -> Result<PathBuf, String> {
    let name = format!("{}_{}_{}", id, slug_tr(first), slug_tr(last));
    let dir = storage_root(handle)?.join("interns").join(name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// Yardımcı: kolon eksikse ekle (SQLite sürümünden bağımsız, güvenli)
fn add_column_if_missing(conn: &Connection, table: &str, col: &str, ty: &str) -> Result<(), String> {
    let mut cols = HashSet::new();
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info('{table}')"))
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let name: String = row.get(1)?; // 1 = name
            Ok(name)
        })
        .map_err(|e| e.to_string())?;
    for r in rows {
        cols.insert(r.map_err(|e| e.to_string())?);
    }
    if !cols.contains(col) {
        conn.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {col} {ty}"),
            [],
        )
        .map_err(|e| format!("ALTER TABLE {} ADD COLUMN {} failed: {}", table, col, e))?;
    }
    Ok(())
}

fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;

    // Temel tablolar
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS interns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            school TEXT NOT NULL,
            department TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            status TEXT NOT NULL,
            contact TEXT NOT NULL,
            email TEXT NOT NULL,
            cv_path TEXT,
            photo_path TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_interns_name ON interns(first_name, last_name);

        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intern_id INTEGER NOT NULL,
            project_type TEXT NOT NULL,
            task_description TEXT NOT NULL,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL,
            file_path TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_assignments_intern ON assignments(intern_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);

        CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intern_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_eval_intern ON evaluations(intern_id);
        "#
    ).map_err(|e| e.to_string())?;

    // Dosya kolonları garanti
    add_column_if_missing(conn, "interns", "cv_name",    "TEXT")?;
    add_column_if_missing(conn, "interns", "cv_mime",    "TEXT")?;
    add_column_if_missing(conn, "interns", "cv_blob",    "BLOB")?;
    add_column_if_missing(conn, "interns", "photo_name", "TEXT")?;
    add_column_if_missing(conn, "interns", "photo_mime", "TEXT")?;
    add_column_if_missing(conn, "interns", "photo_blob", "BLOB")?;

    Ok(())
}

fn open_conn(handle: &AppHandle) -> Result<Connection, String> {
    let db_path = app_db_path(handle)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn)?;
    Ok(conn)
}

// --- Dosyaları MASAÜSTÜ'ne yaz ve DB yollarını güncelle ---

fn persist_files_to_disk(handle: &AppHandle, conn: &Connection, id: i64, i: &InternPayload) -> Result<(), String> {
    let person = person_dir(handle, id, &i.first_name, &i.last_name)?;
    let root   = storage_root(handle)?;

    // CV
    if let Some(ref bytes) = i.cv_blob {
        let fname = i.cv_name.as_deref().unwrap_or("cv.bin");
        let fpath = person.join(fname);
        fs::write(&fpath, bytes).map_err(|e| format!("CV yazılamadı: {e}"))?;

        // İsteğe bağlı: CV klasörüne kopya
        let ext = Path::new(fname).extension().and_then(|e| e.to_str()).unwrap_or("bin");
        let cv_copy = root.join("CV").join(format!("{}_{}_{}.{}", id, slug_tr(&i.first_name), slug_tr(&i.last_name), ext));
        let _ = fs::copy(&fpath, &cv_copy);

        conn.execute(
            "UPDATE interns SET cv_path = ?, cv_name = ?, cv_mime = ? WHERE id = ?",
            params![fpath.to_string_lossy(), i.cv_name, i.cv_mime, id],
        ).map_err(|e| e.to_string())?;
    }

    // Fotoğraf
    if let Some(ref bytes) = i.photo_blob {
        let fname = i.photo_name.as_deref().unwrap_or("photo.bin");
        let fpath = person.join(fname);
        fs::write(&fpath, bytes).map_err(|e| format!("Foto yazılamadı: {e}"))?;

        conn.execute(
            "UPDATE interns SET photo_path = ?, photo_name = ?, photo_mime = ? WHERE id = ?",
            params![fpath.to_string_lossy(), i.photo_name, i.photo_mime, id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// --- KOMUTLAR ---

#[tauri::command]
fn get_interns_from_db(handle: AppHandle) -> Result<Vec<InternLite>, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(
        r#"
        SELECT id, first_name, last_name, school, department,
               start_date, end_date, status, contact, email,
               cv_name, photo_name
        FROM interns
        ORDER BY last_name, first_name
        "#
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(InternLite {
            id: row.get(0)?,
            first_name: row.get(1)?,
            last_name: row.get(2)?,
            school: row.get(3)?,
            department: row.get(4)?,
            start_date: row.get(5)?,
            end_date: row.get(6)?,
            status: row.get(7)?,
            contact: row.get(8)?,
            email: row.get(9)?,
            cv_name: row.get(10)?,
            photo_name: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn get_intern_files(handle: AppHandle, id: i64) -> Result<InternFiles, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(
        r#"
        SELECT cv_name, cv_mime, cv_blob,
               photo_name, photo_mime, photo_blob,
               cv_path, photo_path
        FROM interns
        WHERE id = ?1
        "#
    ).map_err(|e| e.to_string())?;

    let files = stmt.query_row([id], |row| {
        Ok(InternFiles {
            cv_name: row.get(0).ok(),
            cv_mime: row.get(1).ok(),
            cv_blob: row.get(2).ok(),
            photo_name: row.get(3).ok(),
            photo_mime: row.get(4).ok(),
            photo_blob: row.get(5).ok(),
            cv_path: row.get(6).ok(),
            photo_path: row.get(7).ok(),
        })
    }).map_err(|e| e.to_string())?;

    Ok(files)
}

#[tauri::command]
fn add_intern(handle: AppHandle, intern: InternPayload) -> Result<i64, String> {
    let conn = open_conn(&handle)?;
    conn.execute(
        r#"
        INSERT INTO interns
        (first_name, last_name, school, department, start_date, end_date,
         status, contact, email,
         cv_path, photo_path,
         cv_name, cv_mime, cv_blob,
         photo_name, photo_mime, photo_blob)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9,
                ?10, ?11,
                ?12, ?13, ?14,
                ?15, ?16, ?17)
        "#,
        params![
            &intern.first_name,
            &intern.last_name,
            &intern.school,
            &intern.department,
            &intern.start_date,
            intern.end_date.as_deref(),         // Option<&str>
            &intern.status,
            &intern.contact,
            &intern.email,
            intern.cv_path.as_deref(),          // Option<&str>
            intern.photo_path.as_deref(),       // Option<&str>
            intern.cv_name.as_deref(),          // Option<&str>
            intern.cv_mime.as_deref(),          // Option<&str>
            intern.cv_blob.as_deref(),          // Option<&[u8]>
            intern.photo_name.as_deref(),       // Option<&str>
            intern.photo_mime.as_deref(),       // Option<&str>
            intern.photo_blob.as_deref(),       // Option<&[u8]>
        ],
    ).map_err(|e| e.to_string())?;

    let new_id = conn.last_insert_rowid();
    // intern'i hâlâ kullanabiliyoruz çünkü hiçbir alanı move etmedik
    persist_files_to_disk(&handle, &conn, new_id, &intern)?;
    Ok(new_id)
}


#[tauri::command]
fn update_intern(handle: AppHandle, id: i64, intern: InternPayload) -> Result<(), String> {
    let conn = open_conn(&handle)?;

    let mut sets: Vec<String> = vec![
        "first_name = ?1".to_string(),
        "last_name  = ?2".to_string(),
        "school     = ?3".to_string(),
        "department = ?4".to_string(),
        "start_date = ?5".to_string(),
        "end_date   = ?6".to_string(),
        "status     = ?7".to_string(),
        "contact    = ?8".to_string(),
        "email      = ?9".to_string(),
        "cv_path    = ?10".to_string(),
        "photo_path = ?11".to_string(),
    ];

    // Box<dyn ToSql> içine REFERANS koyamazsın; bu yüzden KLON koyuyoruz
    let mut vals: Vec<Box<dyn rusqlite::ToSql>> = vec![
        Box::new(intern.first_name.clone()),
        Box::new(intern.last_name.clone()),
        Box::new(intern.school.clone()),
        Box::new(intern.department.clone()),
        Box::new(intern.start_date.clone()),
        Box::new(intern.end_date.clone()),     // Option<String> klon
        Box::new(intern.status.clone()),
        Box::new(intern.contact.clone()),
        Box::new(intern.email.clone()),
        Box::new(intern.cv_path.clone()),      // Option<String> klon
        Box::new(intern.photo_path.clone()),   // Option<String> klon
    ];
    let mut idx = 12;

    if intern.cv_name.is_some() || intern.cv_mime.is_some() || intern.cv_blob.is_some() {
        sets.push(format!("cv_name = ?{}", idx));  idx += 1;
        sets.push(format!("cv_mime = ?{}", idx));  idx += 1;
        sets.push(format!("cv_blob = ?{}", idx));  idx += 1;

        vals.push(Box::new(intern.cv_name.clone()));
        vals.push(Box::new(intern.cv_mime.clone()));
        // Vec<u8> için de move etmeyelim: klonla
        vals.push(Box::new(intern.cv_blob.clone()));
    }

    if intern.photo_name.is_some() || intern.photo_mime.is_some() || intern.photo_blob.is_some() {
        sets.push(format!("photo_name = ?{}", idx)); idx += 1;
        sets.push(format!("photo_mime = ?{}", idx)); idx += 1;
        sets.push(format!("photo_blob = ?{}", idx)); idx += 1;

        vals.push(Box::new(intern.photo_name.clone()));
        vals.push(Box::new(intern.photo_mime.clone()));
        vals.push(Box::new(intern.photo_blob.clone()));
    }

    let set_clause = sets.join(", ");
    let sql = format!("UPDATE interns SET {} WHERE id = ?{}", set_clause, idx);
    vals.push(Box::new(id));

    let params_slice: Vec<&dyn rusqlite::ToSql> = vals.iter().map(|b| &**b).collect();
    conn.execute(&sql, params_slice.as_slice()).map_err(|e| e.to_string())?;

    // intern burada hâlâ elde: dosyaları diske yaz
    persist_files_to_disk(&handle, &conn, id, &intern)?;
    Ok(())
}


#[tauri::command]
fn delete_intern(handle: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&handle)?;
    conn.execute("DELETE FROM interns WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_assignment(handle: AppHandle, a: Assignment) -> Result<i64, String> {
    let conn = open_conn(&handle)?;
    conn.execute(
        r#"
        INSERT INTO assignments
        (intern_id, project_type, task_description, due_date, status, file_path)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        params![a.intern_id, a.project_type, a.task_description, a.due_date, a.status, a.file_path],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_assignments(handle: AppHandle) -> Result<Vec<Assignment>, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(
        r#"
        SELECT id, intern_id, project_type, task_description, due_date, status, file_path, created_at
        FROM assignments
        ORDER BY due_date ASC, id DESC
        "#
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Assignment {
            id: row.get(0)?,
            intern_id: row.get(1)?,
            project_type: row.get(2)?,
            task_description: row.get(3)?,
            due_date: row.get(4)?,
            status: row.get(5)?,
            file_path: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn delete_assignment(handle: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&handle)?;
    conn.execute("DELETE FROM assignments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_evaluation(handle: AppHandle, e: Evaluation) -> Result<i64, String> {
    let conn = open_conn(&handle)?;
    conn.execute(
        r#"
        INSERT INTO evaluations (intern_id, label, score)
        VALUES (?1, ?2, ?3)
        "#,
        params![e.intern_id, e.label, e.score],
    ).map_err(|er| er.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_evaluations(handle: AppHandle, intern_id: i64) -> Result<Vec<Evaluation>, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(
        r#"
        SELECT id, intern_id, label, score, created_at
        FROM evaluations
        WHERE intern_id = ?1
        ORDER BY created_at DESC, id DESC
        "#
    ).map_err(|er| er.to_string())?;

    let rows = stmt.query_map(params![intern_id], |row| {
        Ok(Evaluation {
            id: row.get(0)?,
            intern_id: row.get(1)?,
            label: row.get(2)?,
            score: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|er| er.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|er| er.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn delete_evaluation(handle: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&handle)?;
    conn.execute("DELETE FROM evaluations WHERE id = ?1", params![id])
        .map_err(|er| er.to_string())?;
    Ok(())
}

#[tauri::command]
fn export_database(handle: AppHandle, export_path: String) -> Result<(), String> {
    let src = app_db_path(&handle)?;
    if !src.exists() {
        return Err("Veritabanı dosyası bulunamadı (henüz oluşturulmamış olabilir).".to_string());
    }
    let export_path = PathBuf::from(export_path);
    if let Some(parent) = export_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Klasör oluşturulamadı: {e}"))?;
    }
    fs::copy(&src, &export_path).map_err(|e| format!("Dosya kopyalanamadı: {e}"))?;
    Ok(())
}

#[tauri::command]
fn save_file(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Dizin oluşturulamadı: {}", e))?;
    }
    fs::write(&path, data).map_err(|e| format!("Dosya yazılamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
fn debug_db_snapshot(handle: AppHandle) -> Result<(String, i64), String> {
    let db_path = app_db_path(&handle)?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn)?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM interns", [], |r| r.get(0))
        .unwrap_or(0);
    Ok((db_path.to_string_lossy().to_string(), count))
}

#[tauri::command]
fn count_interns_missing_note_for_date(handle: AppHandle, date: String) -> Result<i64, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(r#"
        SELECT COUNT(*)
        FROM interns i
        LEFT JOIN evaluations e
          ON e.intern_id = i.id
         AND date(e.created_at) = date(?1)
        WHERE e.id IS NULL
    "#).map_err(|e| e.to_string())?;
    let count: i64 = stmt.query_row([date], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(count)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // app data dir (DB burada)
            let app_dir = app.path().app_data_dir().map_err(|e| format!("app_data_dir: {e}"))?;
            std::fs::create_dir_all(&app_dir).map_err(|e| format!("mkdir: {e}"))?;
            let db_path = app_dir.join("interns.db");

            // tauri-plugin-sql için dsn (opsiyonel)
            let db_url = format!("sqlite:{}", db_path.to_string_lossy().replace('\\', "/"));
            let migrations = get_migrations();
            let plugin = SqlBuilder::default()
                .add_migrations(&db_url, migrations)
                .build();
            app.handle().plugin(plugin)?; 

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // interns
            get_interns_from_db,
            get_intern_files,
            add_intern,
            update_intern,
            delete_intern,
            // assignments
            add_assignment,
            get_assignments,
            delete_assignment,
            // evaluations
            add_evaluation,
            get_evaluations,
            delete_evaluation,
            // utils
            export_database,
            save_file,
            debug_db_snapshot,
            count_interns_missing_note_for_date
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
