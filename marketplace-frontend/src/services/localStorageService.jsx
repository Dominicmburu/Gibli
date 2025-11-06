export const storageService = {
	set: (key, value) => localStorage.setItem(key, value), // 🔥 no JSON.stringify
	get: (key) => localStorage.getItem(key), // 🔥 no JSON.parse
	remove: (key) => localStorage.removeItem(key),
};
