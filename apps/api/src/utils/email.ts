// Every email that reaches the API is stored and compared in lowercase
// (AUTH-32). The database keeps whatever the backend writes.
export const normalizeEmail = (email: string) => email.toLowerCase();
