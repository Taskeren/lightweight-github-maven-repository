let GITHUB_INFO = {
	organization: "Taskeren",
	repository: "test",
	branch: "main",
};

let GITHUB_TOKEN = "";

export function init(token: string, repo_info: string) {
	GITHUB_TOKEN = token;
	const [owner, repo, branch] = repo_info.split("/", 3);
	GITHUB_INFO = {
		organization: owner,
		repository: repo,
		branch: branch,
	};
}

export function get_content_url(path: string): string {
	return `https://raw.githubusercontent.com/${GITHUB_INFO.organization}/${GITHUB_INFO.repository}/${GITHUB_INFO.branch}/${path}`;
}

export function get_repo_url(): string {
	return `https://github.com/${GITHUB_INFO.organization}/${GITHUB_INFO.repository}`;
}

export async function has_content(path: string): Promise<boolean> {
	const resp = await fetch(`https://api.github.com/repos/${GITHUB_INFO.organization}/${GITHUB_INFO.repository}/contents/${path}`, {
		method: "GET",
		headers: {
			"User-Agent": "LWGMR/1.0",
			"Authorization": `Bearer ${GITHUB_TOKEN}`,
			"Accept": "application/vnd.github.object",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	})
	return resp.ok;
}

// the body structure when creating/uploading a file
interface UploadBody {
	message: string
	committer: {
		name: string
		email: string
	}
	content: string
	/**
	 * The SHA of the replaced file.
	 * keep it undefined when creating a new file.
	 */
	sha?: string
	branch?: string
}

export async function upload_content(path: string, content: string, content_sha?: string): Promise<boolean> {
	const body = JSON.stringify({
		message: `Uploaded by Lightweight Github Maven Repository`,
		committer: {
			name: "Lightweight Github Maven Repository",
			email: "foo@bar.com",
		},
		content: content,
		sha: content_sha,
	} satisfies UploadBody);
	const resp = await fetch(`https://api.github.com/repos/${GITHUB_INFO.organization}/${GITHUB_INFO.repository}/contents/${path}`, {
		method: "PUT",
		headers: {
			"User-Agent": "LWGMR/1.0",
			"Authorization": `Bearer ${GITHUB_TOKEN}`,
			"Accept": "application/vnd.github.object",
			"X-GitHub-Api-Version": "2022-11-28",
		},
		body: body
	})
	if (!resp.ok) {
		console.log(new Date(), "Failed to upload", resp, await resp.text())
	}
	return resp.ok;
}
