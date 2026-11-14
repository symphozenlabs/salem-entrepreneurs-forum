<script lang="ts">
	import { navigating } from '$app/state';

	// The forum's four promises, shown one after another while a page loads.
	const words = ['Meet', 'Learn', 'Collaborate', 'Grow'];

	// Only show up for slow moves, so quick clicks don't flash a loader.
	let visible = $state(false);
	$effect(() => {
		if (!navigating.to) {
			visible = false;
			return;
		}
		const t = setTimeout(() => (visible = true), 250);
		return () => clearTimeout(t);
	});
</script>

{#if visible}
	<div class="bar" aria-hidden="true"><span></span></div>
	<div class="veil" role="status" aria-live="polite">
		<div class="card">
			<div class="mark" aria-hidden="true">
				<span class="dot d1"></span>
				<span class="dot d2"></span>
				<span class="dot d3"></span>
				<span class="dot d4"></span>
				<span class="ring"></span>
			</div>
			<div class="words" aria-hidden="true">
				{#each words as w, i (w)}<span style="--i:{i}">{w}</span>{/each}
			</div>
			<span class="sr-only">Loading…</span>
		</div>
	</div>
{/if}

<style>
	/* Thin brass bar sweeping across the top. */
	.bar {
		position: fixed;
		inset: 0 0 auto;
		z-index: 200;
		height: 3px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-brass-400) 20%, transparent);
	}
	.bar span {
		position: absolute;
		inset: 0 auto 0 0;
		width: 40%;
		background: linear-gradient(90deg, transparent, var(--color-brass-300), var(--color-brass-400));
		animation: sweep 1.1s cubic-bezier(0.6, 0, 0.3, 1) infinite;
	}

	.veil {
		position: fixed;
		inset: 0;
		z-index: 199;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--color-ink-950) 18%, transparent);
		backdrop-filter: blur(2px);
		animation: fade-in 0.25s ease-out both;
		pointer-events: none;
	}
	.card {
		display: grid;
		justify-items: center;
		gap: 0.9rem;
		padding: 1.4rem 2rem 1.2rem;
		border-radius: 1rem;
		background: var(--color-ink-950);
		border: 1px solid color-mix(in srgb, var(--color-brass-300) 22%, transparent);
		box-shadow: 0 20px 60px -20px rgb(0 0 0 / 0.6);
		animation: rise 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	/* Four dots — Meet, Learn, Collaborate, Grow — circling and closing in like a handshake. */
	.mark {
		position: relative;
		width: 3.25rem;
		height: 3.25rem;
		animation: turn 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
	}
	.dot {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0.7rem;
		height: 0.7rem;
		margin: -0.35rem;
		border-radius: 999px;
		background: var(--color-brass-300);
		box-shadow: 0 0 12px color-mix(in srgb, var(--color-brass-300) 70%, transparent);
		animation: gather 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate;
	}
	.d1 {
		--x: -1;
		--y: -1;
	}
	.d2 {
		--x: 1;
		--y: -1;
		animation-delay: 0.1s;
		background: var(--color-brass-400);
	}
	.d3 {
		--x: 1;
		--y: 1;
		animation-delay: 0.2s;
	}
	.d4 {
		--x: -1;
		--y: 1;
		animation-delay: 0.3s;
		background: var(--color-brass-400);
	}
	.ring {
		position: absolute;
		inset: 0.55rem;
		border-radius: 999px;
		border: 1.5px solid color-mix(in srgb, var(--color-brass-300) 55%, transparent);
		animation: pulse 1.2s ease-in-out infinite alternate;
	}

	/* The words take turns: Meet → Learn → Collaborate → Grow. */
	.words {
		position: relative;
		height: 1.1rem;
		width: 7.5rem;
		overflow: hidden;
		text-align: center;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--color-brass-200);
	}
	.words span {
		position: absolute;
		inset: 0;
		opacity: 0;
		animation: word 3.2s infinite;
		animation-delay: calc(var(--i) * 0.8s);
	}

	@keyframes sweep {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(260%);
		}
	}
	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
	}
	@keyframes turn {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes gather {
		from {
			transform: translate(calc(var(--x) * 1.05rem), calc(var(--y) * 1.05rem));
		}
		to {
			transform: translate(calc(var(--x) * 0.3rem), calc(var(--y) * 0.3rem)) scale(1.15);
		}
	}
	@keyframes pulse {
		from {
			transform: scale(0.6);
			opacity: 0.2;
		}
		to {
			transform: scale(1.25);
			opacity: 0.9;
		}
	}
	@keyframes word {
		0% {
			opacity: 0;
			transform: translateY(70%);
		}
		6%,
		22% {
			opacity: 1;
			transform: none;
		}
		28%,
		100% {
			opacity: 0;
			transform: translateY(-70%);
		}
	}

	/* Calmer for people who turn motion off: a soft glow, no spinning. */
	@media (prefers-reduced-motion: reduce) {
		.bar span,
		.mark,
		.dot,
		.ring,
		.words span {
			animation: none;
		}
		.dot {
			transform: translate(calc(var(--x) * 0.7rem), calc(var(--y) * 0.7rem));
		}
		.words span:first-child {
			opacity: 1;
		}
		.card {
			animation: none;
		}
	}
</style>
