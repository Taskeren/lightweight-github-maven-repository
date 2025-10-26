import * as gh from './github_api';
import { ContentMetadata } from './github_api';
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
		if (path === 'gh') {
			return Response.redirect(gh.get_repo_url(), 302);
		}

		const perm = auth.authenticate(request, env);
		console.debug('Request path', path);
		console.debug('Permission', perm);

		switch (request.method) {
			case 'HEAD':
				return handleHead(path, perm);
			case 'GET':
				return handleGet(path, perm);
			case 'PUT': // TODO: allow overwriting existing content
				return handlePut(path, request, perm, env);
			case 'DELETE': // TODO: delete uploaded content
				return new Response('Not Implemented', { status: 501 });
			default:
				return new Response('Method Not Allowed', { status: 405 });
		}
	}
} satisfies ExportedHandler<Env>;

function get_path(request: Request): string {
	const url = new URL(request.url);
	return url.pathname.slice(1);
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

async function handlePut(path: string, request: Request, perm: Permission, env: Env): Promise<Response> {
	if (!perm.write) {
		return new Response('Forbidden', { status: 403 });
	}
	const content_metadata_resp = await gh.get_content_metadata(path);
	let sha = undefined;
	// if the content exists, we need to also put the SHA to overwrite it
	if (content_metadata_resp.ok) {
		if (canOverwritten(path) || env.OVERWRITE_ABLE) { // TODO: add an option to allow overwriting other files
			const metadata = await content_metadata_resp.json<ContentMetadata>();
			sha = metadata.sha;
		} else {
			return new Response('Conflict: content already exists', { status: 409 });
		}
	}
	const contentBlob = await request.blob();
	const contentBase64 = await blobToBase64(contentBlob);
	const success = await gh.upload_content(path, contentBase64, sha);
	return new Response(success ? 'OK' : 'Failed', { status: success ? 200 : 500 });
}

async function blobToBase64(blob: Blob): Promise<string> {
	let ab = await blob.arrayBuffer();
	// @ts-ignore
	return Buffer.from(ab).toString('base64');
}

async function blobDigestHex(blob: Blob, algorithm: 'SHA-1' | 'SHA-256'): Promise<string> {
	const ab = await blob.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest(algorithm, ab);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @return `true` if the path should be overwrite-able by default.
 */
function canOverwritten(path: string): boolean {
	// any maven-metadata.xml and its digest hex files
	return getPathAndDigestHexPaths('maven-metadata.xml').some(ending => path.endsWith(ending));
}

/**
 * Get the path and its digest hex paths.
 *
 * For example, input `foo.bar`, return `[foo.bar, foo.bar.md5, foo.bar.sha1, foo.bar.sha256, foo.bar.sha512]`.
 */
function getPathAndDigestHexPaths(path: string): string[] {
	const digestHexEnds = ['.md5', 'sha1', 'sha256', 'sha512'];
	return [path].concat(digestHexEnds.map(end => path + '.' + end));
}
