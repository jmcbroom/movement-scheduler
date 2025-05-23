<script lang="ts">
	import { parse, type Event } from '@markwhen/parser';

	export let markwhenContent: string;

	let events: Event[] = [];
	let currentTime = new Date();

	$: if (markwhenContent) {
		parseSchedule();
	}

	function parseSchedule() {
		const parsed = parse(markwhenContent);
		if (parsed.timelines.length > 0) {
			events = parsed.timelines[0].events.sort((a, b) => {
				const aStart = new Date(a.dateRangeInText.fromDateTime).getTime();
				const bStart = new Date(b.dateRangeInText.fromDateTime).getTime();
				return aStart - bStart;
			});
		}
	}

	function getStageColor(stageName: string): string {
		const colorMap: Record<string, string> = {
			'Movement Stage': 'border-blue-500 bg-blue-50',
			'Pyramid Stage': 'border-red-500 bg-red-50',
			'Red Bull Stage': 'border-orange-500 bg-orange-50',
			'Stargate Stage': 'border-purple-500 bg-purple-50',
			'Waterfront Stage': 'border-teal-500 bg-teal-50',
			'Underground Stage': 'border-gray-600 bg-gray-50'
		};
		return colorMap[stageName] || 'border-gray-400 bg-gray-50';
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function isCurrentlyPlaying(event: Event): boolean {
		const start = new Date(event.dateRangeInText.fromDateTime);
		const end = new Date(event.dateRangeInText.toDateTime);
		return currentTime >= start && currentTime <= end;
	}

	function isUpcoming(event: Event): boolean {
		const start = new Date(event.dateRangeInText.fromDateTime);
		const diff = start.getTime() - currentTime.getTime();
		return diff > 0 && diff < 3600000; // Within next hour
	}
</script>

<div class="max-w-4xl mx-auto p-4">
	<h2 class="text-2xl font-bold text-gray-900 mb-6">Timeline View</h2>
	
	<div class="space-y-4">
		{#each events as event}
			{@const stageName = event.path[0] || 'Unknown Stage'}
			<div 
				class="relative flex items-center space-x-4 p-4 rounded-lg border-l-4 {getStageColor(stageName)} transition-all hover:shadow-md"
				class:ring-2={isCurrentlyPlaying(event)}
				class:ring-yellow-400={isCurrentlyPlaying(event)}
				class:animate-pulse={isCurrentlyPlaying(event)}
			>
				<!-- Time -->
				<div class="flex-shrink-0 w-32 text-right">
					<p class="text-sm font-medium text-gray-900">
						{formatTime(event.dateRangeInText.fromDateTime)}
					</p>
					<p class="text-xs text-gray-500">
						to {formatTime(event.dateRangeInText.toDateTime)}
					</p>
				</div>
				
				<!-- Event details -->
				<div class="flex-grow">
					<div class="flex items-center gap-2">
						<h3 class="font-semibold text-gray-900">
							{event.eventDescription.eventDescription}
						</h3>
						{#if isCurrentlyPlaying(event)}
							<span class="px-2 py-1 text-xs font-medium bg-yellow-400 text-yellow-900 rounded-full">
								NOW PLAYING
							</span>
						{/if}
						{#if isUpcoming(event)}
							<span class="px-2 py-1 text-xs font-medium bg-green-400 text-green-900 rounded-full">
								UP NEXT
							</span>
						{/if}
					</div>
					<p class="text-sm text-gray-600">{stageName}</p>
				</div>
				
				<!-- Visual indicator for current event -->
				{#if isCurrentlyPlaying(event)}
					<div class="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 animate-pulse"></div>
				{/if}
			</div>
		{/each}
	</div>
</div> 