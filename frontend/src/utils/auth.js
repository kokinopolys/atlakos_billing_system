const TOKEN_KEY = 'devsmrs_token';
const USER_KEY  = 'devsmrs_user';

export const authStorage = {
  getToken: ()        => localStorage.getItem(TOKEN_KEY),
  getUser:  ()        => { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } },
  save:     (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
};
