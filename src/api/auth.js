// Token helpers — thin wrappers around localStorage so that the storage
// key ('token') is defined in exactly one place.  Swap these out if the
// storage strategy changes (e.g. sessionStorage or an HttpOnly cookie)
// without touching any component that calls them.

export const saveToken  = (token) => localStorage.setItem('token', token);
export const getToken   = ()      => localStorage.getItem('token');
export const removeToken = ()     => localStorage.removeItem('token');
