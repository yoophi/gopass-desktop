const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+-=";

export function generatePassword(length: number): string {
  if (!Number.isInteger(length) || length < 6 || length > 200) throw new RangeError("6~200자를 입력하세요.");
  let result = "";
  const limit = 256 - 256 % alphabet.length;
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length - result.length))) {
      if (byte < limit) result += alphabet[byte % alphabet.length];
    }
  }
  return result;
}

export function ratePassword(value: string) {
  const rules: [string, boolean][] = [
    ["10자 이상", [...value].length >= 10], ["영문 소문자", /[a-z]/.test(value)],
    ["영문 대문자", /[A-Z]/.test(value)], ["숫자", /\d/.test(value)],
    ["특수문자", /[^\p{L}\p{N}\s]/u.test(value)], ["같은 문자 3회 연속 반복 방지", !/(.)\1\1/u.test(value)],
  ];
  const missing = rules.filter(([, passed]) => !passed).map(([rule]) => rule);
  return { score: Math.round(100 * (rules.length - missing.length) / rules.length), missing };
}
