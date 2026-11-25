/// Evaluate the password line only; trailing metadata must not influence a score.
pub fn password_score(entry: &str) -> u8 {
    let password = entry.lines().next().unwrap_or_default();
    let mut previous = None;
    let mut run = 0;
    let repeated = password.chars().any(|character| {
        run = if previous == Some(character) {
            run + 1
        } else {
            1
        };
        previous = Some(character);
        run >= 3
    });
    let rules = [
        password.chars().count() >= 10,
        password.chars().any(|c| c.is_ascii_lowercase()),
        password.chars().any(|c| c.is_ascii_uppercase()),
        password.chars().any(|c| c.is_ascii_digit()),
        password
            .chars()
            .any(|c| !c.is_alphanumeric() && !c.is_whitespace()),
        !repeated,
    ];
    ((rules.iter().filter(|passed| **passed).count() * 100 + 3) / 6) as u8
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rates_only_first_line() {
        assert_eq!(password_score("aaa\nAB!123456789"), 17);
        assert_eq!(password_score("Secure2026!"), 100);
    }
}
