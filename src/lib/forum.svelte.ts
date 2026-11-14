import { page } from '$app/state';
import { DEFAULT_FORUM, forums, isForumId, type Forum } from './forums.ts';

/** The forum the current page is for (from the root layout's data). */
export function activeForum(): Forum {
	const id = page.data.forum;
	return forums[isForumId(id) ? id : DEFAULT_FORUM];
}

/** Link that switches to another forum; the server remembers it and redirects. */
export const switchHref = (id: string, path = '/') => `${path}?forum=${id}`;
