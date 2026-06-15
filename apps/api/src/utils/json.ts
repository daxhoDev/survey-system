export function json(param: any) {
  return JSON.stringify(param, (key, value) =>
    typeof value === "bigint" ? Number(value.toString()) : value,
  );
}
