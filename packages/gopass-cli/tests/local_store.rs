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
