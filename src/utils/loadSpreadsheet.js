let pending;

// Load the parser only when importing/exporting a workbook. Permit retry if a
// chunk download fails, rather than retaining a rejected promise indefinitely.
export function loadSpreadsheet() {
  if (!pending) pending = import('xlsx').catch(error => { pending = null; throw error; });
  return pending;
}
