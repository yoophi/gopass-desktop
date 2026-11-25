//! Application port for reading entry names without decrypting their contents.
pub trait EntryCatalog {
    type Error;
    fn list_paths(&self) -> Result<Vec<String>, Self::Error>;
}

pub fn list_entries<C: EntryCatalog + ?Sized>(catalog: &C) -> Result<Vec<String>, C::Error> {
    let mut paths = catalog.list_paths()?;
    paths.sort_unstable();
    Ok(paths)
}

pub trait EntryStore: EntryCatalog {
    fn read(&self, path: &str) -> Result<String, Self::Error>;
    fn copy(&self, path: &str) -> Result<(), Self::Error>;
    fn save(&self, path: &str, value: &str, editing: bool) -> Result<(), Self::Error>;
    fn remove(&self, path: &str) -> Result<(), Self::Error>;
    fn history(&self, path: &str) -> Result<Vec<[String; 3]>, Self::Error>;
}

pub trait StoreAdmin: EntryStore {
    fn version(&self) -> Result<String, Self::Error>;
    fn mounts(&self) -> Result<Vec<[String; 2]>, Self::Error>;
    fn add_mount(&self, name: &str, directory: &str) -> Result<(), Self::Error>;
    fn remove_mount(&self, name: &str) -> Result<(), Self::Error>;
    fn sync(&self) -> Result<(), Self::Error>;
}
