<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { privileges } from '#lib/content.ts';
	import { rise, reveal } from '#lib/motion.ts';
	import MemberCard from '#lib/components/MemberCard.svelte';
</script>

<section data-nav="light" class="overflow-hidden bg-ivory-200 py-32 sm:py-44">
	<div class="mx-auto grid max-w-7xl items-center gap-20 px-6 sm:px-10 lg:grid-cols-2">
		<div class="order-2 lg:order-1">
			<MemberCard />
		</div>
		<div class="order-1 lg:order-2">
			<p class="eyebrow text-brass-600">Privileges of membership</p>
			<h2 use:reveal class="display mt-6 text-[clamp(2.75rem,5vw,4.75rem)] text-ink-900">
				Membership you can carry.
			</h2>
			<ul use:rise={{ children: true }} class="mt-12 space-y-5">
				{#each privileges as p (p)}
					<li class="flex items-center gap-4">
						<span
							class="grid size-8 shrink-0 place-items-center rounded-full bg-brass-400/20 text-brass-600"
							aria-hidden="true"><Check class="size-4" strokeWidth={2.5} /></span
						>
						<span class="text-lg font-semibold text-ink-900">{p}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
