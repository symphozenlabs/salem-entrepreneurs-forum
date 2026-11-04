<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight, X } from '@lucide/svelte';

	type Props = {
		/** Form field name; submitted as "YYYY-MM-DDTHH:mm" in India time, like datetime-local. */
		name: string;
		value?: string;
		label: string;
		placeholder?: string;
		/** Optional fields get a clear button. */
		optional?: boolean;
		/** While empty, open on this date-time and borrow its time (e.g. an end after the start). */
		anchor?: string;
		/** Hours added to the anchor's time when it's borrowed. */
		anchorOffsetHours?: number;
	};
	let {
		name,
		value = $bindable(''),
		label,
		placeholder = 'Pick a date and time',
		optional = false,
		anchor = '',
		anchorOffsetHours = 0
	}: Props = $props();

	const pad = (n: number) => String(n).padStart(2, '0');
	const parse = (v: string) => {
		const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v ?? '');
		return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: +m[5] } : null;
	};
	const todayIso = () =>
		new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

	let open = $state(false);
	let root: HTMLDivElement;
	let viewYear = $state(0);
	let viewMonth = $state(0);
	// Time chosen in the panel, kept even before a day is picked.
	let hour = $state(18);
	let minute = $state(0);

	const current = $derived(parse(value));

	function openPanel() {
		const seed = current ?? parse(anchor);
		const [ty, tm] = todayIso().split('-').map(Number);
		viewYear = seed?.y ?? ty;
		viewMonth = seed?.mo ?? tm - 1;
		if (current) {
			hour = current.h;
			minute = current.mi;
		} else if (seed) {
			hour = Math.min(23, seed.h + anchorOffsetHours);
			minute = seed.mi;
		} else {
			hour = 18;
			minute = 0;
		}
		open = true;
	}

	function commit(y: number, mo: number, d: number) {
		value = `${y}-${pad(mo + 1)}-${pad(d)}T${pad(hour)}:${pad(minute)}`;
	}
	function pickDay(d: number) {
		commit(viewYear, viewMonth, d);
	}
	function retime() {
		if (current) commit(current.y, current.mo, current.d);
	}
	function shiftMonth(by: number) {
		const m = viewMonth + by;
		viewYear += Math.floor(m / 12);
		viewMonth = ((m % 12) + 12) % 12;
	}

	const monthTitle = $derived(
		new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			Date.UTC(viewYear, viewMonth, 1)
		)
	);
	const days = $derived.by(() => {
		const lead = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7; // Monday first
		const count = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
		return [
			...Array.from({ length: lead }, () => 0),
			...Array.from({ length: count }, (_, i) => i + 1)
		];
	});
	const iso = (d: number) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
	const selectedIso = $derived(
		current ? `${current.y}-${pad(current.mo + 1)}-${pad(current.d)}` : ''
	);

	const hour12 = $derived(hour % 12 || 12);
	const pm = $derived(hour >= 12);
	const minutes = $derived([...new Set([0, 15, 30, 45, minute])].sort((a, b) => a - b));

	const summary = $derived.by(() => {
		if (!current) return '';
		const on = Date.UTC(current.y, current.mo, current.d);
		const part = (opts: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(on);
		const date = `${part({ weekday: 'short' })}, ${current.d} ${part({ month: 'short' })} ${current.y}`;
		return `${date} · ${current.h % 12 || 12}:${pad(current.mi)} ${current.h >= 12 ? 'PM' : 'AM'}`;
	});

	function outside(e: PointerEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onpointerdown={outside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="relative" bind:this={root}>
	<input type="hidden" {name} {value} />
	<div class="field-input flex items-center gap-2 !p-0">
		<button
			type="button"
			onclick={() => (open ? (open = false) : openPanel())}
			aria-label="{label}: {summary || 'not set'}"
			aria-expanded={open}
			class="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
		>
			<CalendarDays class="size-4 shrink-0 text-brass-600" />
			<span class="truncate {summary ? 'text-ink-900' : 'text-stone-muted'}"
				>{summary || placeholder}</span
			>
		</button>
		{#if optional && value}
			<button
				type="button"
				onclick={() => (value = '')}
				aria-label="Clear {label}"
				class="mr-1.5 rounded p-1.5 text-stone-muted hover:bg-ivory-100 hover:text-ink-900"
				><X class="size-3.5" /></button
			>
		{/if}
	</div>

	{#if open}
		<div
			class="absolute top-full left-0 z-40 mt-2 w-[min(21rem,calc(100vw-3rem))] rounded-xl border border-ink-900/10 bg-white p-4 shadow-xl shadow-ink-950/10"
			role="dialog"
			aria-label={label}
		>
			<!-- Month -->
			<div class="flex items-center justify-between">
				<button
					type="button"
					onclick={() => shiftMonth(-1)}
					aria-label="Previous month"
					class="rounded-full p-1.5 hover:bg-ivory-100"><ChevronLeft class="size-4" /></button
				>
				<p class="font-semibold">{monthTitle}</p>
				<button
					type="button"
					onclick={() => shiftMonth(1)}
					aria-label="Next month"
					class="rounded-full p-1.5 hover:bg-ivory-100"><ChevronRight class="size-4" /></button
				>
			</div>

			<!-- Days -->
			<div class="mt-3 grid grid-cols-7 gap-1 text-center">
				{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as wd, i (i)}
					<span class="pb-1 text-[0.7rem] font-semibold text-stone-muted">{wd}</span>
				{/each}
				{#each days as d, i (i)}
					{#if d}
						{@const day = iso(d)}
						<button
							type="button"
							onclick={() => pickDay(d)}
							aria-pressed={day === selectedIso}
							class="aspect-square rounded-full text-sm transition-colors {day === selectedIso
								? 'bg-ink-900 font-semibold text-brass-200'
								: day === todayIso()
									? 'font-semibold text-brass-600 ring-1 ring-brass-500 hover:bg-ivory-100'
									: day < todayIso()
										? 'text-stone-muted/60 hover:bg-ivory-100'
										: 'hover:bg-ivory-100'}">{d}</button
						>
					{:else}
						<span></span>
					{/if}
				{/each}
			</div>

			<!-- Time -->
			<div class="mt-4 border-t border-ink-900/10 pt-4">
				<div class="flex items-center justify-between">
					<p class="text-xs font-semibold tracking-wide text-stone-muted uppercase">Time</p>
					<div class="flex rounded-full bg-ivory-100 p-0.5 text-xs font-semibold">
						{#each [false, true] as isPm (isPm)}
							<button
								type="button"
								onclick={() => {
									hour = (hour % 12) + (isPm ? 12 : 0);
									retime();
								}}
								aria-pressed={pm === isPm}
								class="rounded-full px-3 py-1 {pm === isPm
									? 'bg-ink-900 text-ivory-50'
									: 'text-ink-700'}">{isPm ? 'PM' : 'AM'}</button
							>
						{/each}
					</div>
				</div>
				<div class="mt-3 grid grid-cols-6 gap-1.5">
					{#each Array.from({ length: 12 }, (_, i) => i + 1) as h (h)}
						<button
							type="button"
							onclick={() => {
								hour = (h % 12) + (pm ? 12 : 0);
								retime();
							}}
							aria-pressed={hour12 === h}
							class="rounded-md py-1.5 text-sm {hour12 === h
								? 'bg-ink-900 font-semibold text-ivory-50'
								: 'bg-ivory-50 hover:bg-ivory-100'}">{h}</button
						>
					{/each}
				</div>
				<div class="mt-2 grid grid-cols-4 gap-1.5">
					{#each minutes as m (m)}
						<button
							type="button"
							onclick={() => {
								minute = m;
								retime();
							}}
							aria-pressed={minute === m}
							class="rounded-md py-1.5 text-sm {minute === m
								? 'bg-brass-400 font-semibold text-ink-950'
								: 'bg-ivory-50 hover:bg-ivory-100'}">:{pad(m)}</button
						>
					{/each}
				</div>
			</div>

			<div class="mt-4 flex items-center justify-between">
				<p class="text-xs text-stone-muted">
					{current ? summary : 'Pick a day to set the date'}
				</p>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded-full bg-ink-900 px-4 py-1.5 text-xs font-semibold text-ivory-50 hover:bg-ink-700"
					>Done</button
				>
			</div>
		</div>
	{/if}
</div>
