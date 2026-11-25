use gopass_cli::GopassCli;
use gopass_core::{EntryCatalog, EntryStore};

// Run in a disposable, initialized gopass store created by the test runner.
#[test]
#[ignore = "requires an isolated GOPASS_HOMEDIR with a disposable store"]
fn multiline_entry_lifecycle() {
    assert_eq!(std::env::var("GOPASS_FIXTURE").as_deref(), Ok("disposable"));
    let cli = GopassCli;
    let path = "test/메일 계정";
    assert!(cli.list_paths().unwrap().is_empty());
    let initial = "dummy\nnotes: one\n\n";
    cli.save(path, initial, false).unwrap();
    assert_eq!(cli.read(path).unwrap(), initial);
    assert!(cli.save(path, "replacement", false).is_err());
    assert_eq!(cli.read(path).unwrap(), initial);
    cli.save(path, "changed\nsecond\n", true).unwrap();
    assert_eq!(cli.read(path).unwrap(), "changed\nsecond\n");
    assert!(cli.history(path).unwrap().len() >= 2);
    assert!(cli.remove("test").is_err());
    cli.remove(path).unwrap();
    assert!(cli.list_paths().unwrap().is_empty());
}

#[test]
#[ignore = "requires two isolated disposable stores and an initialized git remote"]
fn mounts_and_sync() {
    use gopass_core::StoreAdmin;
    let cli = GopassCli;
    assert_eq!(std::env::var("GOPASS_FIXTURE").as_deref(), Ok("disposable"));
    let dir = std::env::var("GOPASS_FIXTURE_MOUNT").unwrap();
    cli.add_mount("qa team", &dir).unwrap();
    assert!(cli
        .mounts()
        .unwrap()
        .iter()
        .any(|[name, path]| name == "qa team"
            && std::fs::canonicalize(path).unwrap() == std::fs::canonicalize(&dir).unwrap()));
    assert!(cli
        .add_mount("qa team", &dir)
        .unwrap_err()
        .to_string()
        .contains("이름"));
    assert!(cli
        .add_mount("other", &dir)
        .unwrap_err()
        .to_string()
        .contains("경로"));
    assert!(cli
        .list_paths()
        .unwrap()
        .contains(&"qa team/fixture".into()));
    cli.sync().unwrap();
    cli.remove_mount("qa team").unwrap();
    assert!(cli.mounts().unwrap().is_empty());
    assert!(!cli
        .list_paths()
        .unwrap()
        .contains(&"qa team/fixture".into()));
}
