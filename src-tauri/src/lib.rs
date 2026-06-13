#[tauri::command]
fn save_file(file_name: String, content: Vec<u8>) -> Result<String, String> {
  let file_path = rfd::FileDialog::new()
    .set_file_name(&file_name)
    .save_file();

  match file_path {
    Some(path) => {
      std::fs::write(&path, content)
        .map_err(|e| e.to_string())?;
      Ok(path.to_string_lossy().into_owned())
    }
    None => Err("Save cancelled".to_string()),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![save_file])
    .setup(|app| {
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
