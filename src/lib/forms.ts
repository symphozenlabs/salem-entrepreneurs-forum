// Admin-built registration forms. Every form starts with name, email and phone;
// these are the extra questions an event adds, stored on the event as JSON.

export const fieldTypes = {
	text: 'Short answer',
	textarea: 'Long answer',
	email: 'Email',
	phone: 'Phone number',
	number: 'Number',
	date: 'Date',
	select: 'Dropdown (pick one)',
	radio: 'Choices (pick one)',
	checkbox: 'Checkboxes (pick any)',
	yesno: 'Yes / No'
} as const;

export type FieldType = keyof typeof fieldTypes;

export type FormField = {
	/** Stable across edits, so a renamed question keeps its answers together. */
	id: string;
	type: FieldType;
	label: string;
	help?: string;
	required: boolean;
	/** For select, radio and checkbox. */
	options?: string[];
};

export const hasOptions = (type: FieldType) =>
	type === 'select' || type === 'radio' || type === 'checkbox';

export const MAX_FIELDS = 25;

export const newFieldId = () => Math.random().toString(36).slice(2, 10);

/**
 * Cleans a form definition from the admin (or the database): drops anything malformed
 * and caps sizes. Returns an error message when the admin's form can't be saved as is.
 */
export function cleanFields(input: unknown): { fields: FormField[]; error?: string } {
	if (!Array.isArray(input)) return { fields: [] };
	const fields: FormField[] = [];
	const seen = new Set<string>();
	for (const raw of input.slice(0, MAX_FIELDS)) {
		if (!raw || typeof raw !== 'object') continue;
		const f = raw as Record<string, unknown>;
		const type = String(f.type) as FieldType;
		if (!(type in fieldTypes)) continue;
		const label = String(f.label ?? '')
			.trim()
			.slice(0, 200);
		if (!label) return { fields, error: 'Every question needs a label.' };
		let id =
			String(f.id ?? '')
				.replace(/[^a-z0-9]/gi, '')
				.slice(0, 16) || newFieldId();
		while (seen.has(id)) id = newFieldId();
		seen.add(id);
		const field: FormField = {
			id,
			type,
			label,
			required: f.required === true,
			...(String(f.help ?? '').trim() ? { help: String(f.help).trim().slice(0, 300) } : {})
		};
		if (hasOptions(type)) {
			const options = [
				...new Set(
					(Array.isArray(f.options) ? f.options : [])
						.map((o) => String(o).trim().slice(0, 120))
						.filter(Boolean)
				)
			].slice(0, 30);
			if (options.length < (type === 'checkbox' ? 1 : 2))
				return {
					fields,
					error: `“${label}” needs ${type === 'checkbox' ? 'at least one option' : 'at least two options'}.`
				};
			field.options = options;
		}
		fields.push(field);
	}
	return { fields };
}

/** Form-control name for a question, kept apart from the built-in fields. */
export const fieldName = (f: FormField) => `q_${f.id}`;

export type Answer = { label: string; value: string };

/**
 * Reads a registrant's answers from submitted form data. Returns the answers in
 * question order, with field errors keyed by question id.
 */
export function readAnswers(fields: FormField[], data: FormData) {
	const answers: Answer[] = [];
	const errors: Record<string, string> = {};
	for (const f of fields) {
		const name = fieldName(f);
		let value: string;
		if (f.type === 'checkbox') {
			const picked = data
				.getAll(name)
				.map(String)
				.filter((v) => f.options?.includes(v));
			value = picked.join(', ');
		} else {
			value = String(data.get(name) ?? '')
				.trim()
				.slice(0, 2000);
		}

		if (!value) {
			if (f.required)
				errors[f.id] = f.type === 'checkbox' ? 'Pick at least one.' : 'Please answer this.';
			answers.push({ label: f.label, value: '' });
			continue;
		}
		if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
			errors[f.id] = 'Enter a valid email.';
		if (f.type === 'phone' && value.replace(/\D/g, '').length < 10)
			errors[f.id] = 'Enter a 10-digit number.';
		if (f.type === 'number' && !Number.isFinite(Number(value))) errors[f.id] = 'Enter a number.';
		if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[f.id] = 'Pick a date.';
		if ((f.type === 'select' || f.type === 'radio') && !f.options?.includes(value))
			errors[f.id] = 'Pick one of the options.';
		if (f.type === 'yesno' && value !== 'Yes' && value !== 'No') errors[f.id] = 'Pick Yes or No.';
		answers.push({ label: f.label, value });
	}
	return { answers, errors };
}
