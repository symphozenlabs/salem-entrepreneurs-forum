<script lang="ts">
	import { privileges, type Membership } from '#lib/content.ts';
	import { rise, reveal } from '#lib/motion.ts';
	import MemberCard from '#lib/components/MemberCard.svelte';

	let { membership }: { membership: Membership } = $props();
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
			<ul use:rise={{ children: true }} class="mt-14 space-y-10">
				{#each privileges(membership) as p (p.n)}
					<li class="grid grid-cols-[3.5rem_1fr] gap-4">
						<span class="display text-3xl text-brass-500">{p.n}</span>
						<div>
							<h3 class="text-lg font-semibold text-ink-900">{p.title}</h3>
							<p class="mt-2 max-w-md text-stone-muted">{p.body}</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
