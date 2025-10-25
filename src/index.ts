import * as gh from './github_api';
import * as auth from './auth';
import { Permission } from './auth';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const path = get_path(request);
		if (path.length === 0) {
			return new Response('Lightweight Github Maven Repository!', { status: 404 });
		}

		// init GitHub API
		gh.init(env.GH_TOKEN, env.GH_REPO_INFO);
		if (path === "gh") {
			return Response.redirect(gh.get_repo_url(), 302);
		}

		const perm = auth.authenticate(request, env);
		console.debug("Request path", path);
		console.debug("Permission", perm);

		switch (request.method) {
			case "HEAD":
				return handleHead(path, perm);
			case "GET":
				return handleGet(path, perm);
			case "PUT": // TODO: allow overwriting existing content
				return handlePut(path, request, perm);
			case "DELETE": // TODO: delete uploaded content
				return new Response('Not Implemented', { status: 501 });
			default:
				return new Response('Method Not Allowed', { status: 405 });
		}
	},
} satisfies ExportedHandler<Env>;

function get_path(request: Request): string {
	const url = new URL(request.url);
	const key = url.pathname.slice(1);
	return key;
}

async function handleHead(path: string, perm: Permission): Promise<Response> {
	if (!perm.read) {
		return new Response('Forbidden', { status: 403 });
	}
	// redirect to the raw content URL
	return Response.redirect(gh.get_content_url(path), 302);
}

async function handleGet(path: string, perm: Permission): Promise<Response> {
	if (!perm.read) {
		return new Response('Forbidden', { status: 403 });
	}
	// redirect to the raw content URL
	return Response.redirect(gh.get_content_url(path), 302);
}

async function handlePut(path: string, request: Request, perm: Permission): Promise<Response> {
	if (!perm.write) {
		return new Response('Forbidden', { status: 403 });
	}
	if (await gh.has_content(path)) {
		return new Response('Conflict: content already exists', { status: 409 });
	}
	const contentBlob = await request.blob();
	const contentBase64 = await blobToBase64(contentBlob);
	const success = await gh.upload_content(path, contentBase64);
	return new Response(success ? 'OK' : 'Failed', { status: success ? 200 : 500 });
}

async function blobToBase64(blob: Blob): Promise<string> {
	let ab = await blob.arrayBuffer()
	return Buffer.from(ab).toString('base64');
}

async function blobDigestHex(blob: Blob, algorithm: "SHA-1" | "SHA-256"): Promise<string> {
	const ab = await blob.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest(algorithm, ab);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
}
