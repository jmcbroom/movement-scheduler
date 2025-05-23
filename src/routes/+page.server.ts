import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export async function load({ fetch }) {
	try {
		const response = await fetch('/movement-schedule.markwhen');
		const markwhenContent = await response.text();
		return {
			markwhenContent
		};
	} catch (e) {
		console.error('Error loading schedule:', e);
		return {
			markwhenContent: ''
		};
	}
} 