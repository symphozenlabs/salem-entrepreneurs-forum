import type { AuthUser, AuthSession } from '#lib/server/auth.ts';
import type { ForumId } from '#lib/forums.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: AuthUser;
			session?: AuthSession;
			/** The forum this request is for. */
			forum: ForumId;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
