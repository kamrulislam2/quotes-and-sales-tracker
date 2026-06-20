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

#[tauri::command]
fn custom_relaunch() -> Result<(), String> {
  let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
  
  #[cfg(target_os = "windows")]
  {
    let exe_str = current_exe.to_string_lossy().into_owned();
    let cmd_str = format!("timeout /t 2 > NUL && start \"\" \"{}\"", exe_str);
    std::process::Command::new("cmd.exe")
      .args(&["/C", &cmd_str])
      .spawn()
      .map_err(|e| e.to_string())?;
  }

  #[cfg(not(target_os = "windows"))]
  {
    std::process::Command::new(current_exe)
      .spawn()
      .map_err(|e| e.to_string())?;
  }

  std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![save_file, custom_relaunch])
    .setup(|app| {
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
