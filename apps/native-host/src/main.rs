use serde_json::{json, Value};
use std::io::{self, Read, Write};

// sendNativeMessage starts one process per request.
fn respond(input: &mut impl Read, output: &mut impl Write) -> io::Result<()> {
    let mut length = [0; 4];
    input.read_exact(&mut length)?;
    let size = u32::from_ne_bytes(length) as usize;
    let reply = if size > 4096 {
        json!({"error":"요청이 너무 큽니다."})
    } else {
        let mut request = vec![0; size];
        input.read_exact(&mut request)?;
        match serde_json::from_slice::<Value>(&request)
            .ok()
            .and_then(|v| v.get("action").cloned())
        {
            Some(Value::String(action)) if action == "list_entries" => {
                match gopass_core::list_entries(&gopass_cli::GopassCli) {
                    Ok(paths) => json!({"paths":paths}),
                    Err(error) => json!({"error":error.to_string()}),
                }
            }
            _ => json!({"error":"지원하지 않는 요청입니다."}),
        }
    };
    let mut bytes = serde_json::to_vec(&reply)?;
    if bytes.len() > 1024 * 1024 {
        bytes = serde_json::to_vec(
            &json!({"error":"경로 목록이 Chrome의 메시지 크기 제한을 초과합니다."}),
        )?;
    }
    output.write_all(&(bytes.len() as u32).to_ne_bytes())?;
    output.write_all(&bytes)?;
    output.flush()
}

fn main() -> io::Result<()> {
    respond(&mut io::stdin().lock(), &mut io::stdout().lock())
}
