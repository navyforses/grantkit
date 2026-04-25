// All "go to login" links route to the in-app email/password page.
// Kept as a function (not a constant) so existing call sites continue
// to compile; future cleanup can inline as `"/login"`.
export const getLoginUrl = () => "/login";
