#[macro_use]
extern crate log;

mod commands;
mod r2;
mod server;
mod tvbox;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    // 启动内嵌 HTTP Server（在独立线程的 tokio runtime 中）
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().expect("tokio runtime");
        rt.block_on(server::run(8090));
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // TVBox 解析
            commands::parse_tvbox,
            commands::get_content,
            // 连通性检测
            commands::check_vods,
            commands::check_lives,
            commands::check_parses,
            commands::check_url_list,
            // 文件操作
            commands::read_file,
            commands::write_file,
            commands::write_file_bytes,
            commands::delete_file,
            commands::create_dir,
            commands::list_dir,
            commands::download_file,
            // HTTP Server 控制
            commands::server_cache,
            commands::server_get_cache,
            commands::get_lan_ips,
            commands::is_app_installed,
            // R2 上传
            commands::r2_test,
            commands::r2_upload_text,
            commands::r2_upload_file,
            commands::r2_list,
            commands::r2_delete,
            // 工具
            commands::hash_content,
            commands::push_to_tvbox,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
