export interface Permission {
	read: boolean
	write: boolean
}

export function authenticate(request: Request, env: Env): Permission {
	const header = request.headers.get("Authorization");
	if (header === null || !header.startsWith("Basic ")) {
		// allow read by default
		return { read: true, write: false };
	}
	const loginString = atob(header.substring("Basic ".length));
	const [username, token] = loginString.split(":");
	if (env.ADMIN_USERNAME === username && env.ADMIN_PASSWORD === token) {
		return { read: true, write: true };
	}
	return { read: false, write: false };
}
