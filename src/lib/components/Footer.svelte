<script lang="ts">
	import { brand, contact } from '#lib/content.ts';

	const columns = [
		{
			title: 'Forum',
			links: [
				{ label: 'Our story', href: '/#story' },
				{ label: 'Why SEF', href: '/#why' },
				{ label: 'Events', href: '/events' },
				{ label: 'Member directory', href: '/members' }
			]
		},
		{
			title: 'Membership',
			links: [
				{ label: 'Apply', href: '/join' },
				{ label: 'Member login', href: '/login' },
				{ label: 'Referral programme', href: '/referrals' },
				{ label: 'Verify a member pass', href: '/membership-card' }
			]
		}
	];
</script>

<footer data-nav="dark" class="relative overflow-hidden bg-ink-950 pt-28 text-ivory-100">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<div class="grid gap-14 lg:grid-cols-[5fr_3fr_3fr_4fr]">
			<div>
				<img src="/brand/logo-light.png" alt={brand.name} class="w-56" />
				<p class="mt-8 max-w-xs text-sm leading-relaxed text-ivory-200/60">{brand.description}</p>
			</div>
			{#each columns as col (col.title)}
				<nav aria-label={col.title}>
					<p class="eyebrow text-brass-300">{col.title}</p>
					<ul class="mt-6 space-y-3 text-sm">
						{#each col.links as l (l.href)}
							<li><a href={l.href} class="text-ivory-200/70 transition-colors hover:text-ivory-50">{l.label}</a></li>
						{/each}
					</ul>
				</nav>
			{/each}
			<div>
				<p class="eyebrow text-brass-300">Secretariat</p>
				<address class="mt-6 text-sm leading-relaxed text-ivory-200/70 not-italic">
					{#each contact.address as line (line)}{line}<br />{/each}
					<a href={contact.phoneHref} class="mt-4 inline-block hover:text-ivory-50">{contact.phone}</a><br />
					<a href="mailto:{contact.email}" class="hover:text-ivory-50">{contact.email}</a>
				</address>
			</div>
		</div>

		<div class="mt-20 flex flex-col justify-between gap-4 border-t border-ivory-100/10 py-8 text-xs text-ivory-200/40 sm:flex-row">
			<p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
			<p>Official chapter · Salem, Tamil Nadu</p>
		</div>
	</div>

	<!-- Oversized wordmark bleeding off the bottom edge -->
	<p
		aria-hidden="true"
		class="display pointer-events-none -mb-[0.2em] text-center text-[34vw] leading-none whitespace-nowrap text-ivory-50/[0.04] select-none"
	>
		Salem
	</p>
</footer>
