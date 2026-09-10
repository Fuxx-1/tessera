export function cx(...values: Array<string | false | null | undefined | 0 | 0n>) {
  return values.filter(Boolean).join(" ");
}
