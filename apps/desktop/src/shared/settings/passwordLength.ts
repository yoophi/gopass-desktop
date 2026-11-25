export function passwordLength() {
  const length = Number(localStorage.getItem("passwordLength"));
  return Number.isInteger(length) && length >= 6 && length <= 200 ? length : 50;
}
