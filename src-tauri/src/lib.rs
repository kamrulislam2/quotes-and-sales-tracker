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
fn custom_relaunch(app: tauri::AppHandle) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = current_exe.to_string_lossy().into_owned();
    let cmd_str = format!("timeout /t 2 > NUL && start \"\" \"{}\"", exe_str);
    std::process::Command::new("cmd.exe")
      .args(&["/C", &cmd_str])
      .spawn()
      .map_err(|e| e.to_string())?;
    std::process::exit(0);
  }

  #[cfg(not(target_os = "windows"))]
  {
    app.restart();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "windows")]
  {
    // Add a 1.2-second startup delay on Windows to ensure that any preceding instance
    // (such as one being replaced/restarted by the auto-updater) has fully exited
    // and released its WebView2 user data directory locks.
    std::thread::sleep(std::time::Duration::from_millis(1200));
  }

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
