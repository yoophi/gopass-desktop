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

use gopass_core::EntryStore;
use std::{io::Write, process::Stdio};

fn checked_path(path: &str) -> io::Result<&str> {
    if path.trim() != path
        || path.chars().any(char::is_control)
        || path.contains('\\')
        || path.split('/').any(|part| matches!(part, "" | "." | ".."))
    {
        return Err(io::Error::other("올바른 항목 경로를 입력하세요."));
    }
    Ok(path)
}

fn run(args: &[&str], input: Option<&str>) -> io::Result<String> {
    let mut child = Command::new("gopass")
        .args(args)
        .stdin(if input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()?;
    let written = if let Some(value) = input {
        child
            .stdin
            .take()
            .expect("piped stdin")
            .write_all(value.as_bytes())
    } else {
        Ok(())
    };
    let result = child.wait_with_output()?;
    written?;
    if !result.status.success() {
        return Err(io::Error::other(format!(
            "gopass 작업 실패 ({})",
            result.status
        )));
    }
    String::from_utf8(result.stdout).map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))
}

impl EntryStore for GopassCli {
    fn read(&self, path: &str) -> io::Result<String> {
        run(
            &[
                "show",
                "--noparsing",
                "--unsafe",
                "--nofuzzysearch",
                "--",
                checked_path(path)?,
            ],
            None,
        )
    }
    fn copy(&self, path: &str) -> io::Result<()> {
        run(
            &["show", "-c", "--nofuzzysearch", "--", checked_path(path)?],
            None,
        )
        .map(drop)
    }
    fn save(&self, path: &str, value: &str, editing: bool) -> io::Result<()> {
        let path = checked_path(path)?;
        let exists = self.list_paths()?.iter().any(|p| p == path);
        if exists != editing {
            return Err(io::Error::other(if exists {
                "같은 경로의 항목이 있습니다."
            } else {
                "편집할 항목이 없습니다."
            }));
        }
        if value.is_empty() {
            return Err(io::Error::other("값을 입력하세요."));
        }
        let args: &[&str] = if editing {
            &["insert", "--force", "--", path]
        } else {
            &["insert", "--", path]
        };
        run(args, Some(value)).map(drop)
    }
    fn remove(&self, path: &str) -> io::Result<()> {
        let path = checked_path(path)?;
        if !self.list_paths()?.iter().any(|p| p == path) {
            return Err(io::Error::other("삭제할 항목이 없습니다."));
        }
        run(&["rm", "--force", "--", path], None).map(drop)
    }
    fn history(&self, path: &str) -> io::Result<Vec<[String; 3]>> {
        let history = run(&["history", "--", checked_path(path)?], None)?;
        Ok(history
            .lines()
            .filter_map(|line| {
                let mut fields = line.splitn(4, " - ");
                fields.next()?;
                Some([
                    fields.next()?.into(),
                    fields.next()?.into(),
                    fields.next()?.into(),
                ])
            })
            .collect())
    }
}
