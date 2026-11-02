import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const prefersReducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;

/** Smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis never drift apart. */
export function startSmoothScroll() {
	if (lenis || prefersReducedMotion()) return () => {};

	lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -80 } });
	lenis.on('scroll', ScrollTrigger.update);
	const tick = (time: number) => lenis?.raf(time * 1000);
	gsap.ticker.add(tick);
	gsap.ticker.lagSmoothing(0);

	return () => {
		gsap.ticker.remove(tick);
		lenis?.destroy();
		lenis = null;
	};
}

export const getLenis = () => lenis;

/**
 * Splits an element's text into masked words that rise into place when scrolled into view.
 * Usage: <h2 use:reveal>…</h2>  or  use:reveal={{ delay: 0.2 }}
 */
export function reveal(node: HTMLElement, opts: { delay?: number; stagger?: number } = {}) {
	if (prefersReducedMotion()) return;

	const words = node.textContent?.trim().split(/\s+/) ?? [];
	node.setAttribute('aria-label', node.textContent?.trim() ?? '');
	node.innerHTML = words
		.map(
			(w) =>
				`<span aria-hidden="true" style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:0.08em;margin-bottom:-0.08em"><span data-w style="display:inline-block">${w}</span></span>`
		)
		.join(' ');

	const tween = gsap.from(node.querySelectorAll('[data-w]'), {
		yPercent: 110,
		rotate: 4,
		duration: 1.1,
		ease: 'expo.out',
		stagger: opts.stagger ?? 0.06,
		delay: opts.delay ?? 0,
		scrollTrigger: { trigger: node, start: 'top 85%' }
	});

	return { destroy: () => tween.scrollTrigger?.kill() };
}

/** Fades and lifts an element (or its direct children, staggered) into view. */
export function rise(node: HTMLElement, opts: { children?: boolean; y?: number; delay?: number } = {}) {
	if (prefersReducedMotion()) return;
	const targets = opts.children ? Array.from(node.children) : node;
	const tween = gsap.from(targets, {
		y: opts.y ?? 40,
		opacity: 0,
		duration: 1.2,
		ease: 'expo.out',
		stagger: 0.09,
		delay: opts.delay ?? 0,
		scrollTrigger: { trigger: node, start: 'top 88%' }
	});
	return { destroy: () => tween.scrollTrigger?.kill() };
}

/** Pulls an element gently towards the pointer. */
export function magnetic(node: HTMLElement, strength = 0.3) {
	if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
	const xTo = gsap.quickTo(node, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
	const yTo = gsap.quickTo(node, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });

	const move = (e: PointerEvent) => {
		const r = node.getBoundingClientRect();
		xTo((e.clientX - (r.left + r.width / 2)) * strength);
		yTo((e.clientY - (r.top + r.height / 2)) * strength);
	};
	const leave = () => {
		xTo(0);
		yTo(0);
	};
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}
