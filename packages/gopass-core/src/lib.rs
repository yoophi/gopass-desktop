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
