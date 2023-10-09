

use std::process::{Command, Stdio};
use std::env;
use std::io;
use std::fs::File;
use std::io::Write;

use crate::controllers::app_controller::SharedState;
use crate::config::AppContext;

pub fn cron_backup_res(state: &SharedState) -> io::Result<()> {
    if let Some(db_username) = env::var("DB_USERNAME").ok() {
        let acontext: &AppContext = &*state.clone();

        let src = format!("{}/res", &acontext.app_root);
        let dst = format!("{}/res.swp", &acontext.app_root);

        println!("{} CRON JOB: Running mariadb-dump", chrono::Local::now());

        let mariadb_dump = Command::new("mariadb-dump")
            .arg("-u")
            .arg(&db_username)
            .arg("--password=".to_string() + &env::var("DB_PASSWORD").unwrap())
            .arg("--databases")
            .arg("taskcentral")
            .stdout(Stdio::piped())
            .spawn()?;
        let gzip = Command::new("gzip")
            .arg("-9")
            .stdin(mariadb_dump.stdout.ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Failed to open mariadb-dump stdout"))?)
            .stdout(Stdio::piped())
            .spawn()?;

        let output_file = format!("{}/mariadb_dump.sql.gz", src);
        let mut file = File::create(output_file)?;
        let gzip_output = gzip.wait_with_output()?;
        file.write_all(&gzip_output.stdout)?;

        println!("{} CRON JOB: mariadb-dump to gzip completed.", chrono::Local::now());


        let rsync_exists = Command::new("sh").arg("-c")
            .arg("command -v rsync >/dev/null 2>&1").status()?;
        let command = if rsync_exists.success() {
            format!("rsync -a {}/ {}/", src, dst)
        } else {
            format!("cp -r --preserve=all {}/ {}/", src, dst)
        };

        println!("{} CRON JOB: Running {}", chrono::Local::now(), command);

        let output = Command::new("sh").arg("-c").arg(&command).output()?;

        if output.status.success() {
            println!("Copy successful.");
        } else {
            eprintln!("Error: {}", String::from_utf8_lossy(&output.stderr));
        }
    }
    Ok(())
}
