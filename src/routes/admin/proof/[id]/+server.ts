import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { paymentProof } from '#lib/server/db/schema.ts';
import { imageResponse } from '#lib/server/uploads.ts';

/** Payment screenshots. Under /admin, so only admins get here (see hooks.server.ts). */
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404);
	const [proof] = await db
		.select({ mime: paymentProof.mime, data: paymentProof.data })
		.from(paymentProof)
		.where(eq(paymentProof.paymentId, id));
	if (!proof) error(404);
	return imageResponse(proof, 'private, no-store');
};
