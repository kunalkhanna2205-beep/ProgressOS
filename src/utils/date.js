export function getLocalDateString(dateObj = new Date()) {
  // Uses the local system timezone (Asia/Kolkata for this user).
  // Formats strictly as YYYY-MM-DD to avoid timezone offset drift at midnight.
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
