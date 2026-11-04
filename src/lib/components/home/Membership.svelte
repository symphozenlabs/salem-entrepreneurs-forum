<script lang="ts">
	import { rupees, type Membership } from '#lib/content.ts';
	import type { PaymentInfo } from '#lib/membership.ts';
	import { magnetic, reveal, rise } from '#lib/motion.ts';

	let {
		membership,
		payment,
		qrSvg
	}: { membership: Membership; payment: PaymentInfo; qrSvg: string | null } = $props();

	const steps = [
		{ t: 'Apply', d: 'Tell us about you and your business. Five minutes.' },
		{ t: 'Review', d: 'The secretariat reviews every application within 24 business hours.' },
		{ t: 'Confirm', d: 'Pay the annual fee by UPI or bank transfer; we verify it manually.' },
		{ t: 'Welcome', d: 'Your digital member pass and directory profile go live.' }
	];
</script>

<section
	id="membership"
	data-nav="dark"
	class="relative overflow-hidden bg-ink-950 py-32 text-ivory-100 sm:py-44"
>
	<div
		class="pointer-events-none absolute -right-1/4 -bottom-1/3 size-[70vmax] rounded-full bg-[radial-gradient(circle,rgb(165_73_44/0.18),transparent_60%)]"
	></div>

	<div class="relative mx-auto max-w-7xl px-6 sm:px-10">
		<p class="eyebrow text-brass-300">Limited openings</p>
		<h2 use:reveal class="display mt-6 max-w-4xl text-[clamp(2.75rem,6vw,5.5rem)]">
			Ready to grow your business in Salem?
		</h2>

		<div class="mt-20 grid gap-16 lg:grid-cols-[5fr_6fr]">
			<div
				use:rise
				class="relative rounded-[2px] bg-gradient-to-b from-ink-800 to-ink-900 p-10 ring-1 ring-brass-400/30"
			>
				<div class="hairline absolute inset-x-10 top-0"></div>
				<p class="eyebrow text-brass-300">Annual membership</p>
				<p class="mt-8 flex items-baseline gap-3">
					<span class="display text-brass-gradient text-7xl sm:text-8xl"
						>{rupees(membership.fee)}</span
					>
					<span class="text-ivory-200/60">/ {membership.period}</span>
				</p>
				<ul class="mt-10 space-y-4">
					{#each membership.includes as item, i (i)}
						<li class="flex gap-4 text-ivory-200/85">
							<span class="mt-2.5 h-px w-4 shrink-0 bg-brass-400"></span>{item}
						</li>
					{/each}
				</ul>
				{#if payment.upiId}
					<div class="mt-10 flex items-center gap-5 rounded border border-ivory-100/10 p-4">
						{#if qrSvg}
							<div class="size-24 shrink-0 rounded bg-white p-1 [&_svg]:h-full [&_svg]:w-full">
								<!-- Generated server-side from the admin's UPI ID. -->
								{@html qrSvg}
							</div>
						{/if}
						<div class="min-w-0">
							<p class="eyebrow text-brass-300">Pay by UPI</p>
							<p class="mt-1.5 truncate font-mono text-sm">{payment.upiId}</p>
							<p class="mt-1 text-xs text-ivory-200/55">
								Scan to pay, then apply with the transaction ID.
							</p>
						</div>
					</div>
				{/if}
				<a
					use:magnetic={0.2}
					href="/join"
					class="mt-12 block rounded-full bg-brass-400 py-5 text-center text-sm font-semibold tracking-wide text-ink-950 transition-colors hover:bg-brass-300"
					>Apply for membership</a
				>
				<p class="mt-5 text-center text-xs text-ivory-200/50">{membership.note}</p>
			</div>

			<ol use:rise={{ children: true }} class="grid content-start gap-px sm:grid-cols-2">
				{#each steps as s, i (s.t)}
					<li class="bg-ivory-100/[0.03] p-8 ring-1 ring-ivory-100/[0.06]">
						<span class="display text-5xl text-brass-400/80">0{i + 1}</span>
						<h3 class="mt-6 text-lg font-semibold">{s.t}</h3>
						<p class="mt-2 text-sm leading-relaxed text-ivory-200/65">{s.d}</p>
					</li>
				{/each}
			</ol>
		</div>
	</div>
</section>
