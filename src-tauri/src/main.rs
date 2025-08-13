#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog;
use tauri_plugin_fs;


#[derive(Debug, Serialize, Deserialize)]
struct Intern {
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
    cv_path: Option<String>,
    photo_path: Option<String>,
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

// --- MIGRATIONS ---

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
    ]
}

// --- YOL & BAĞLANTI ---

fn app_db_path(handle: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir alınamadı: {e}"))?;
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("app_data_dir oluşturulamadı: {e}"))?;
    Ok(app_dir.join("interns.db"))
}

fn ensure_schema(conn: &Connection) -> Result<(), String> {
    // foreign key kaskadlarının çalışması için
    conn.execute_batch("PRAGMA foreign_keys = ON;").map_err(|e| e.to_string())?;

    conn.execute_batch(
        r#"
        -- interns
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

        -- assignments
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

        -- evaluations
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
    ).map_err(|e| e.to_string())
}

fn open_conn(handle: &AppHandle) -> Result<Connection, String> {
    let db_path = app_db_path(handle)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    ensure_schema(&conn)?;
    Ok(conn)
}

// --- KOMUTLAR ---

#[tauri::command]
fn get_interns_from_db(handle: AppHandle) -> Result<Vec<Intern>, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(
        r#"
        SELECT id, first_name, last_name, school, department,
               start_date, end_date, status, contact, email, cv_path, photo_path
        FROM interns
        ORDER BY last_name, first_name
        "#
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Intern {
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
            cv_path: row.get(10)?,
            photo_path: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn add_intern(handle: AppHandle, intern: Intern) -> Result<i64, String> {
    let conn = open_conn(&handle)?;
    conn.execute(
        r#"
        INSERT INTO interns
        (first_name, last_name, school, department, start_date, end_date,
         status, contact, email, cv_path, photo_path)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        "#,
        rusqlite::params![
            intern.first_name,
            intern.last_name,
            intern.school,
            intern.department,
            intern.start_date,
            intern.end_date,
            intern.status,
            intern.contact,
            intern.email,
            intern.cv_path,
            intern.photo_path,
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_intern(handle: AppHandle, id: i64, intern: Intern) -> Result<(), String> {
    let conn = open_conn(&handle)?;
    conn.execute(
        r#"
        UPDATE interns SET
            first_name = ?1, last_name  = ?2, school = ?3, department = ?4,
            start_date = ?5, end_date   = ?6, status = ?7, contact = ?8,
            email      = ?9, cv_path    = ?10, photo_path = ?11
        WHERE id = ?12
        "#,
        rusqlite::params![
            intern.first_name, intern.last_name, intern.school, intern.department,
            intern.start_date, intern.end_date,  intern.status,  intern.contact,
            intern.email,      intern.cv_path,   intern.photo_path, id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_intern(handle: AppHandle, id: i64) -> Result<(), String> {
    let conn = open_conn(&handle)?;
    conn.execute("DELETE FROM interns WHERE id = ?1", rusqlite::params![id])
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
        rusqlite::params![a.intern_id, a.project_type, a.task_description, a.due_date, a.status, a.file_path],
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
    conn.execute("DELETE FROM assignments WHERE id = ?1", rusqlite::params![id])
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
        rusqlite::params![e.intern_id, e.label, e.score],
    ).map_err(|er| er.to_string())?;
    Ok(conn.last_insert_rowid())
}


#[tauri::command]
fn get_evaluations(handle: AppHandle, internId: i64) -> Result<Vec<Evaluation>, String> {
    let conn = open_conn(&handle)?;
    let mut stmt = conn.prepare(
        r#"
        SELECT id, intern_id, label, score, created_at
        FROM evaluations
        WHERE intern_id = ?1
        ORDER BY created_at DESC, id DESC
        "#
    ).map_err(|er| er.to_string())?;

    let rows = stmt.query_map(rusqlite::params![internId], |row| {
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
    conn.execute("DELETE FROM evaluations WHERE id = ?1", rusqlite::params![id])
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
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM interns", [], |r| r.get(0)).unwrap_or(0);
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
        .plugin({
            let migrations = get_migrations();
            SqlBuilder::default()
                // Not: "sqlite:interns.db" plugin tarafında app_data_dir altında oluşur;
                // open_conn() de aynı konumu kullanır → tutarlıdır.
                .add_migrations("sqlite:interns.db", migrations)
                .build()
        })
        .invoke_handler(tauri::generate_handler![
            // interns
            get_interns_from_db,
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