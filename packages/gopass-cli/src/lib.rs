use gopass_core::EntryCatalog;
use std::{io, process::Command};

pub struct GopassCli;

impl EntryCatalog for GopassCli {
    type Error = io::Error;

    fn list_paths(&self) -> io::Result<Vec<String>> {
        let output = Command::new("gopass").args(["list", "--flat"]).output()?;
        if !output.status.success() {
            return Err(io::Error::other(format!(
                "gopass 종료 상태: {}",
                output.status
            )));
        }
        let paths = String::from_utf8(output.stdout)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
        Ok(paths
            .lines()
            .filter(|s| !s.is_empty())
            .map(str::to_owned)
            .collect())
    }
}
