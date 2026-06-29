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

#[tauri::command]
fn pick_directory() -> Result<String, String> {
  let dir_path = rfd::FileDialog::new()
    .pick_folder();

  match dir_path {
    Some(path) => Ok(path.to_string_lossy().into_owned()),
    None => Err("Directory selection cancelled".to_string()),
  }
}

#[tauri::command]
fn save_file_to_dir(base_dir: String, sub_folder: Option<String>, file_name: String, content: Vec<u8>) -> Result<String, String> {
  let mut path = std::path::PathBuf::from(&base_dir);
  if let Some(sub) = sub_folder {
    path.push(sub);
  }
  std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
  path.push(file_name);
  std::fs::write(&path, content).map_err(|e| e.to_string())?;
  Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn overwrite_file(file_path: String, content: Vec<u8>) -> Result<(), String> {
  if let Some(parent) = std::path::Path::new(&file_path).parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  std::fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_ip_data(url: String, headers: Option<std::collections::HashMap<String, String>>) -> Result<String, String> {
  let client = reqwest::Client::new();
  let mut req = client.get(&url);
  
  if let Some(h) = headers {
    for (k, v) in h {
      req = req.header(k, v);
    }
  }
  
  let res = req.send()
    .await
    .map_err(|e| e.to_string())?;
    
  let status = res.status();
  let body = res.text()
    .await
    .map_err(|e| e.to_string())?;
    
  if !status.is_success() {
    return Err(format!("HTTP error {}", status.as_u16()));
  }
  
  Ok(body)
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
    .invoke_handler(tauri::generate_handler![save_file, custom_relaunch, overwrite_file, pick_directory, save_file_to_dir, fetch_ip_data])
    .setup(|app| {
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
