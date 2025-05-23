<script lang="ts">
  import { parse } from "@markwhen/parser";
  import { onMount, createEventDispatcher } from "svelte";
  import Icon from "@iconify/svelte";

  export let markwhenContent: string;
  export let activeView: "grid" | "timeline" = "grid";

  // Create a custom event to notify parent of view changes
  const dispatch = createEventDispatcher();

  let events: any[] = [];
  let stages: Record<string, any[]> = {};
  let timeSlots: string[] = [];
  let currentTime = new Date();
  let selectedDay = "";
  let availableDays: string[] = [];
  let filteredStages: Record<string, any[]> = {};
  let orderedStageNames: string[] = [];
  let mySchedule: Set<string> = new Set();
  let shareButtonText = "Share Schedule";
  let groupByStage = false;

  $: myScheduleEvents = mySchedule && stages ? getMyScheduleEvents() : [];

  // Format day display with date
  function formatDayWithDate(dayString: string): {
    short: string;
    full: string;
  } {
    // dayString is like "Saturday, May 24"
    const parts = dayString.split(", ");
    const dayName = parts[0]; // "Saturday"
    const monthDay = parts[1]; // "May 24"

    if (monthDay) {
      // Convert "May 24" to "5/24" format
      const date = new Date(monthDay + ", 2025");
      const month = date.getMonth() + 1; // getMonth() is 0-based
      const day = date.getDate();
      const shortDate = `${month}/${day}`;

      return {
        short: `${dayName.slice(0, 3)} ${shortDate}`, // "Sat 5/24"
        full: `${dayName} ${shortDate}`, // "Saturday 5/24"
      };
    }

    return { short: dayName, full: dayName };
  }

  // Create continuous 30-minute time slots from 13:00 to 02:00
  const createTimeSlots = () => {
    const slots = [];
    // Main day: 13:00 to 23:30 (11 hours × 2 = 22 slots)
    for (let hour = 13; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    // Early morning: 00:00 to 02:00 (5 slots)
    slots.push("00:00");
    slots.push("00:30");
    slots.push("01:00");
    slots.push("01:30");
    slots.push("02:00");

    return slots; // Total: 27 slots
  };

  $: if (markwhenContent) {
    parseSchedule();
  }

  $: if (stages && selectedDay !== undefined) {
    filterByDay();
  }

  function parseSchedule() {
    try {
      const parsed = parse(markwhenContent);
      console.log("Parsed result:", parsed);

      events = [];
      extractEventsFromContent();
      timeSlots = createTimeSlots();
    } catch (error) {
      console.error("Error parsing schedule:", error);
      events = [];
      stages = {};
      timeSlots = createTimeSlots();
    }
  }

  function extractEventsFromContent() {
    const lines = markwhenContent.split("\n");
    let currentSection = "";

    lines.forEach((line) => {
      line = line.trim();
      if (line.startsWith("section ")) {
        currentSection = line.replace("section ", "");
      } else if (line.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}-\d{2}:\d{2}:/)) {
        const [dateTime, ...titleParts] = line.split(": ");
        const title = titleParts.join(": ");
        const [date, timeRange] = dateTime.split(" ");
        const [startTime, endTime] = timeRange.split("-");

        const event = {
          title,
          section: currentSection,
          date,
          startTime,
          endTime,
          dateRangeInText: {
            fromDateTime: `${date}T${startTime}:00`,
            toDateTime: `${date}T${endTime}:00`,
          },
          eventDescription: {
            eventDescription: title,
          },
          path: [currentSection],
        };

        events.push(event);
      }
    });

    // Get unique days using a more reliable method
    const daySet = new Set<string>();
    const dayMap = new Map<string, string>(); // Maps display name to date string

    events.forEach((event) => {
      const dateStr = event.date; // Use the original date string (2024-05-25)
      const date = new Date(dateStr + "T12:00:00"); // Add time to avoid timezone issues
      const dayDisplay = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC", // Use UTC to avoid timezone issues
      });
      daySet.add(dayDisplay);
      dayMap.set(dayDisplay, dateStr);
    });

    availableDays = Array.from(daySet).sort((a, b) => {
      const dateA = dayMap.get(a)!;
      const dateB = dayMap.get(b)!;
      return dateA.localeCompare(dateB);
    });

    // Set first day as default if no day is selected
    if (!selectedDay && availableDays.length > 0) {
      selectedDay = availableDays[0];
    }

    console.log("Available days:", availableDays);

    // Group events by stage (section)
    stages = {};
    events.forEach((event) => {
      const stageName = event.section || "Unknown Stage";
      if (!stages[stageName]) {
        stages[stageName] = [];
      }
      stages[stageName].push(event);
    });

    console.log("Stages:", stages);
  }

  function filterByDay() {
    // Define consistent stage order
    const stageOrder = [
      "Movement Stage",
      "Waterfront Stage",
      "Star Gate",
      "Underground Stage",
      "Pyramid Stage",
      "Detroit Stage",
    ];

    filteredStages = {};
    orderedStageNames = [];

    // Process stages in consistent order
    stageOrder.forEach((stageName) => {
      const stageEvents = stages[stageName];
      if (!stageEvents) return;

      const dayEvents = stageEvents.filter((event) => {
        const dateStr = event.date;
        const date = new Date(dateStr + "T12:00:00");
        const dayDisplay = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        });
        return dayDisplay === selectedDay;
      });

      // Only include stages that have events
      if (dayEvents.length > 0) {
        filteredStages[stageName] = dayEvents;
        orderedStageNames.push(stageName);
      }
    });
  }

  function timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number);
    // Handle times after midnight (00:00 - 02:00) as next day
    const adjustedHours = hours < 13 ? hours + 24 : hours;
    return adjustedHours * 60 + minutes;
  }

  function getEventPosition(event: any) {
    const startTime = event.startTime;
    const endTime = event.endTime;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // Base time is 13:00 (13 * 60 = 780 minutes)
    const baseMinutes = 13 * 60;

    // Calculate exact pixel position
    // Each 30-minute slot is 80px wide, so each minute is 80/30 = 2.67px
    const pixelsPerMinute = 80 / 30;

    // Round to 5-minute increments for cleaner positioning
    const minutesFromStart = startMinutes - baseMinutes;
    const roundedMinutesFromStart = Math.round(minutesFromStart / 5) * 5;

    const duration = endMinutes - startMinutes;
    const roundedDuration = Math.round(duration / 5) * 5;

    // Calculate pixel positions
    const leftPosition = roundedMinutesFromStart * pixelsPerMinute;
    const width = roundedDuration * pixelsPerMinute;

    return { leftPosition, width };
  }

  function getStageColor(stageName: string): string {
    const colorMap: Record<string, string> = {
      "Movement Stage": "bg-blue-500 dark:bg-blue-700",
      "Pyramid Stage": "bg-red-500 dark:bg-red-700",
      "Detroit Stage": "bg-orange-500 dark:bg-orange-700",
      "Star Gate": "bg-purple-500 dark:bg-purple-700",
      "Waterfront Stage": "bg-teal-500 dark:bg-teal-700",
      "Underground Stage": "bg-indigo-500 dark:bg-indigo-700",
    };
    return colorMap[stageName] || "bg-gray-400 dark:bg-gray-600";
  }

  function getStageColorLight(stageName: string): string {
    const colorMap: Record<string, string> = {
      "Movement Stage": "bg-blue-100 dark:bg-blue-900",
      "Pyramid Stage": "bg-red-100 dark:bg-red-900",
      "Detroit Stage": "bg-orange-100 dark:bg-orange-900",
      "Star Gate": "bg-purple-100 dark:bg-purple-900",
      "Waterfront Stage": "bg-teal-100 dark:bg-teal-900",
      "Underground Stage": "bg-indigo-100 dark:bg-indigo-900",
    };
    return colorMap[stageName] || "bg-gray-100 dark:bg-gray-800";
  }

  function isCurrentlyPlaying(event: any): boolean {
    const start = new Date(event.dateRangeInText.fromDateTime);
    const end = new Date(event.dateRangeInText.toDateTime);
    return currentTime >= start && currentTime <= end;
  }

  // Generate unique event ID
  function getEventId(event: any): string {
    return `${event.date}-${event.startTime}-${event.section}-${event.title}`;
  }

  // Load my schedule from localStorage
  function loadMySchedule() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("movement-schedule");
      if (saved) {
        try {
          const savedArray = JSON.parse(saved);
          mySchedule = new Set(savedArray);
        } catch (e) {
          console.error("Error loading schedule:", e);
          mySchedule = new Set();
        }
      }
    }
  }

  // Save my schedule to localStorage
  function saveMySchedule() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "movement-schedule",
        JSON.stringify([...mySchedule])
      );
    }
  }

  // Toggle event in my schedule
  function toggleEventInSchedule(event: any) {
    const eventId = getEventId(event);
    if (mySchedule.has(eventId)) {
      mySchedule.delete(eventId);
    } else {
      mySchedule.add(eventId);
    }
    mySchedule = mySchedule; // Trigger reactivity
    saveMySchedule();
  }

  // Check if event is in my schedule
  function isInMySchedule(event: any): boolean {
    return mySchedule.has(getEventId(event));
  }

  // Handle view change
  function handleViewChange(view: "grid" | "timeline") {
    dispatch("viewChange", view);
  }

  // Get my schedule events
  function getMyScheduleEvents() {
    const myEvents: any[] = [];
    Object.values(stages).forEach((stageEvents) => {
      stageEvents.forEach((event) => {
        if (isInMySchedule(event)) {
          myEvents.push(event);
        }
      });
    });

    // Sort by date and time
    return myEvents.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  // Get my schedule events grouped by day
  function getMyScheduleEventsByDay() {
    const events = getMyScheduleEvents();
    const eventsByDay: Record<string, any[]> = {};

    events.forEach((event) => {
      const date = new Date(event.date + "T12:00:00");
      const dayName = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      if (!eventsByDay[dayName]) {
        eventsByDay[dayName] = [];
      }
      eventsByDay[dayName].push(event);
    });

    return eventsByDay;
  }

  // Get timeline events for selected day (sorted by time)
  function getTimelineEvents() {
    const allEvents: any[] = [];
    Object.values(filteredStages).forEach((stageEvents) => {
      allEvents.push(...stageEvents);
    });

    // Sort by start time
    return allEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Get timeline events grouped by stage
  function getTimelineEventsByStage() {
    const stageOrder = [
      "Movement Stage",
      "Waterfront Stage",
      "Star Gate",
      "Underground Stage",
      "Pyramid Stage",
      "Detroit Stage",
    ];

    const groupedEvents: { stageName: string; events: any[] }[] = [];

    stageOrder.forEach((stageName) => {
      const stageEvents = filteredStages[stageName];
      if (stageEvents && stageEvents.length > 0) {
        const sortedEvents = [...stageEvents].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
        groupedEvents.push({
          stageName,
          events: sortedEvents,
        });
      }
    });

    return groupedEvents;
  }

  	// Generate plain text schedule
	function generateTextSchedule(): string {
		const events = getMyScheduleEvents();
		if (events.length === 0) {
			return "My Movement Detroit 2025 Schedule\n\nNo events selected yet!\n\nGenerated from movement.det.city";
		}

		let text = "My Movement Detroit 2025 Schedule\n\n";
		
		// Group events by day
		const eventsByDay: Record<string, any[]> = {};
		events.forEach((event) => {
			const date = new Date(event.date + "T12:00:00");
			const dayName = date.toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				timeZone: "UTC",
			});
			if (!eventsByDay[dayName]) {
				eventsByDay[dayName] = [];
			}
			eventsByDay[dayName].push(event);
		});

		// Generate text for each day
		Object.entries(eventsByDay).forEach(([dayName, dayEvents]) => {
			const formattedDay = formatDayWithDate(dayName).full;
			text += `${formattedDay}\n`;
			text += "=".repeat(formattedDay.length) + "\n\n";
			dayEvents.forEach((event) => {
				text += `${event.title} @ ${event.section} | ${event.startTime} - ${event.endTime}\n`;
			});
			text += "\n";
		});

		text += `https://movement.det.city`;
		return text;
	}

  	// Copy schedule to clipboard
	async function shareSchedule() {
		try {
			const text = generateTextSchedule();
			await navigator.clipboard.writeText(text);
			
			// Show success feedback
			shareButtonText = "✓ Copied!";
			setTimeout(() => {
				shareButtonText = "Share Schedule";
			}, 2000);
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement("textarea");
			textArea.value = generateTextSchedule();
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			
			shareButtonText = "✓ Copied!";
			setTimeout(() => {
				shareButtonText = "Share Schedule";
			}, 2000);
		}
	}

	onMount(() => {
		// Load saved schedule
		loadMySchedule();
		
		// Update current time every minute
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 60000);

		return () => clearInterval(interval);
	});

  console.log(timeSlots)
</script>

<div class="w-full">
  <div class="p-4">
    <!-- Header -->
    <div class="mb-6">
      <!-- Title -->
             <a 
         href="https://movement.det.city" 
         target="_blank" 
         rel="noopener noreferrer"
         class="block text-center sm:text-left mb-12 hover:opacity-80 transition-opacity duration-200"
       >
         <h1
           class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white"
           style="font-family: 'Sixtyfour', monospace;"
         >
           movement detroit<br/>2025 schedule
         </h1>
       </a>

      <!-- Navigation -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <!-- Day selector buttons -->
        <div class="flex flex-col sm:flex-row gap-2">
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-300 sm:hidden mb-1 text-center"
            >Select Day:</span
          >
          <div class="flex gap-2 justify-center sm:justify-start">
            {#each availableDays as day}
              {@const dayFormat = formatDayWithDate(day)}
              <button
                class="flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 {selectedDay ===
                day
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}"
                on:click={() => (selectedDay = day)}
              >
                <span class="sm:hidden">{dayFormat.short}</span>
                <span class="hidden sm:inline">{dayFormat.full}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- View selector -->
        <div class="flex flex-col sm:flex-row items-center gap-2">
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-300 sm:hidden"
            >View:</span
          >
          <div
            class="bg-gray-100 dark:bg-gray-700 rounded-md p-1 flex w-full sm:w-auto"
          >
            <button
              class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded transition-all {activeView ===
              'grid'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}"
              on:click={() => handleViewChange("grid")}
            >
              Grid
            </button>
            <button
              class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded transition-all {activeView ===
              'timeline'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}"
              on:click={() => handleViewChange("timeline")}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>
    </div>

    {#if activeView === "grid"}
      <!-- Schedule Grid -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex max-h-screen"
      >
        <!-- Sticky Stage Names Column -->
        <div class="flex-shrink-0 bg-gray-100 dark:bg-gray-700">
          <!-- Time slots header spacer -->
          <div
            class="w-20 sm:w-32 lg:w-48 h-12 bg-gray-100 dark:bg-gray-700 border-b border-r border-gray-300 dark:border-gray-600"
          ></div>
          <!-- Stage names -->
          {#each orderedStageNames as stageName}
            <div
              class="w-20 sm:w-32 lg:w-48 h-20 p-1 sm:p-2 lg:p-4 font-semibold {getStageColor(
                stageName
              )} text-white flex items-center border-b border-r border-gray-300 dark:border-gray-600"
            >
              <!-- Mobile: Show short names -->
              <span class="text-xs leading-tight text-center w-full sm:hidden">
                {stageName
                  .replace("Movement Stage", "Movement")
                  .replace("Waterfront Stage", "Waterfront")
                  .replace("Star Gate", "Star")
                  .replace("Underground Stage", "Underground")
                  .replace("Pyramid Stage", "Pyramid")
                  .replace("Detroit Stage", "Detroit")}
              </span>
              <!-- Desktop: Show full names -->
              <span
                class="text-sm lg:text-base leading-tight text-center w-full hidden sm:block"
              >
                {stageName}
              </span>
            </div>
          {/each}
        </div>

        <!-- Scrollable Schedule Area -->
        <div class="flex-grow overflow-x-auto overflow-y-hidden">
          <!-- Time slots header -->
          <div
            class="relative bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 h-12"
            style="min-width: {timeSlots.length * 80}px;"
          >
            <!-- Grid lines -->
            <div class="flex h-full">
              {#each timeSlots as slot}
                <div class="w-20 flex-shrink-0"></div>
              {/each}
            </div>
            <!-- Time labels positioned over grid lines -->
            {#each timeSlots as slot, i}
              <div
                class="absolute top-0 h-full flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300 pointer-events-none"
                style="left: {i * 80}px; width: 0px;"
              >
                {slot}
              </div>
            {/each}
          </div>

          <!-- Schedule rows with events -->
          {#each orderedStageNames as stageName}
            {@const stageEvents = filteredStages[stageName]}
            <div
              class="relative h-20 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              style="min-width: {timeSlots.length * 80}px;"
            >
              <!-- Hour markers -->
              {#each Array(14) as _, i}
                <div
                  class="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-600 pointer-events-none"
                  style="left: {i * 160}px;"
                ></div>
              {/each}

              <!-- Events positioned absolutely within this row -->
              {#each stageEvents as event}
                {@const position = getEventPosition(event)}
                {@const isPlaying = isCurrentlyPlaying(event)}
                {@const inMySchedule = isInMySchedule(event)}
                <div
                  class="absolute h-14 mt-3 rounded-md p-2 transition-all cursor-pointer overflow-hidden select-none {getStageColorLight(
                    stageName
                  )}"
                  class:ring-2={isPlaying || inMySchedule}
                  class:ring-offset-2={isPlaying || inMySchedule}
                  class:ring-yellow-400={isPlaying}
                  class:ring-blue-500={inMySchedule && !isPlaying}
                  class:animate-pulse={isPlaying}
                  class:opacity-95={inMySchedule}
                  class:shadow-lg={inMySchedule}
                  class:hover:opacity-80={!inMySchedule}
                  class:hover:scale-105={!inMySchedule}
                  style="
									left: {position.leftPosition}px;
									width: {position.width - 4}px;
									z-index: {isPlaying ? 5 : inMySchedule ? 3 : 1};
								"
                  on:click={() => toggleEventInSchedule(event)}
                  on:keydown={(e) =>
                    e.key === "Enter" && toggleEventInSchedule(event)}
                  role="button"
                  tabindex="0"
                >
                  <p
                    class="font-medium text-gray-900 dark:text-white text-xs leading-tight"
                  >
                    {event.title}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {event.startTime}-{event.endTime}
                  </p>
                  {#if isPlaying}
                    <span class="absolute top-1 right-1 flex h-2 w-2">
                      <span
                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"
                      ></span>
                      <span
                        class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"
                      ></span>
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Timeline View -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
      >
        <!-- Timeline Controls -->
        <div
          class="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Timeline View - {selectedDay.split(",")[0]}
            </h3>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={groupByStage}
                class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Group by stage</span
              >
            </label>
          </div>
        </div>

        {#if groupByStage}
          <!-- Grouped by Stage Timeline -->
          {#each getTimelineEventsByStage() as stageGroup}
            <div
              class="border-b border-gray-200 dark:border-gray-600 last:border-b-0"
            >
              <div class="bg-gray-100 dark:bg-gray-700 px-6 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="w-4 h-4 rounded-full {getStageColor(
                      stageGroup.stageName
                    )}"
                  ></div>
                  <h4
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {stageGroup.stageName}
                  </h4>
                </div>
              </div>
              <div class="divide-y divide-gray-100 dark:divide-gray-600">
                {#each stageGroup.events as event}
                  {@const isPlaying = isCurrentlyPlaying(event)}
                  {@const inMySchedule = isInMySchedule(event)}
                  <div
                    class="flex items-start sm:items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    class:bg-blue-50={inMySchedule}
                    class:dark:bg-blue-900={inMySchedule}
                    class:border-l-4={inMySchedule}
                    class:border-blue-500={inMySchedule}
                    on:click={() => toggleEventInSchedule(event)}
                    on:keydown={(e) =>
                      e.key === "Enter" && toggleEventInSchedule(event)}
                    role="button"
                    tabindex="0"
                  >
                    <div class="flex-grow pr-3">
                      <!-- Artist name -->
                      <div class="flex items-center gap-2 sm:gap-3 mb-1">
                        <h5
                          class="font-semibold text-base sm:text-lg text-gray-900 dark:text-white {isPlaying
                            ? 'text-yellow-700 dark:text-yellow-400'
                            : ''}"
                        >
                          {event.title}
                        </h5>
                        {#if isPlaying}
                          <span
                            class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm font-medium"
                          >
                            <span
                              class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full animate-pulse"
                            ></span>
                            <span class="hidden sm:inline">Now Playing</span>
                            <span class="sm:hidden">Live</span>
                          </span>
                        {/if}
                      </div>
                      <!-- Time -->
                      <div class="text-sm text-gray-600 dark:text-gray-300">
                        <span class="font-medium"
                          >{event.startTime} - {event.endTime}</span
                        >
                      </div>
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                      {#if inMySchedule}
                        <span
                          class="text-blue-600 font-medium text-sm hidden sm:inline"
                          >Added</span
                        >
                        <div
                          class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                        >
                          <Icon icon="mdi:check" class="w-4 h-4 text-white" />
                        </div>
                      {:else}
                        <span class="text-gray-400 text-sm hidden sm:inline"
                          >Click to add</span
                        >
                        <div
                          class="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-blue-500 transition-colors"
                        >
                          <Icon icon="mdi:plus" class="w-4 h-4 text-gray-400" />
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <!-- Chronological Timeline -->
          <div class="divide-y divide-gray-100 dark:divide-gray-600">
            {#each getTimelineEvents() as event}
              {@const isPlaying = isCurrentlyPlaying(event)}
              {@const inMySchedule = isInMySchedule(event)}
              <div
                class="flex items-start sm:items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                class:bg-blue-50={inMySchedule}
                class:dark:bg-blue-900={inMySchedule}
                class:border-l-4={inMySchedule}
                class:border-blue-500={inMySchedule}
                on:click={() => toggleEventInSchedule(event)}
                on:keydown={(e) =>
                  e.key === "Enter" && toggleEventInSchedule(event)}
                role="button"
                tabindex="0"
              >
                <div class="flex-grow pr-3">
                  <!-- Artist name -->
                  <div class="flex items-center gap-2 sm:gap-3 mb-1">
                    <h4
                      class="font-semibold text-base sm:text-lg text-gray-900 dark:text-white {isPlaying
                        ? 'text-yellow-700 dark:text-yellow-400'
                        : ''}"
                    >
                      {event.title}
                    </h4>
                    {#if isPlaying}
                      <span
                        class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm font-medium"
                      >
                        <span
                          class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full animate-pulse"
                        ></span>
                        <span class="hidden sm:inline">Now Playing</span>
                        <span class="sm:hidden">Live</span>
                      </span>
                    {/if}
                  </div>
                  <!-- Time and Stage -->
                  <div
                    class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span class="font-medium"
                      >{event.startTime} - {event.endTime}</span
                    >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-3 h-3 rounded-full {getStageColor(
                          event.section
                        )}"
                      ></div>
                      <span>{event.section}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  {#if inMySchedule}
                    <span
                      class="text-blue-600 font-medium text-sm hidden sm:inline"
                      >Added</span
                    >
                    <div
                      class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                    >
                      <Icon icon="mdi:check" class="w-4 h-4 text-white" />
                    </div>
                  {:else}
                    <span class="text-gray-400 text-sm hidden sm:inline"
                      >Click to add</span
                    >
                    <div
                      class="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-blue-500 transition-colors"
                    >
                      <Icon icon="mdi:plus" class="w-4 h-4 text-gray-400" />
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- My Schedule -->
    <div class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          My Schedule
        </h2>
        <div class="flex items-center gap-4">
          {#if myScheduleEvents.length > 0}
            <button
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 {shareButtonText ===
              '✓ Copied!'
                ? 'bg-green-600 hover:bg-green-700'
                : ''}"
              on:click={shareSchedule}
              disabled={shareButtonText === "✓ Copied!"}
            >
              {#if shareButtonText === "✓ Copied!"}
                <Icon icon="mdi:check" class="w-4 h-4" />
              {:else}
                <Icon icon="mdi:share-variant" class="w-4 h-4" />
              {/if}
              {shareButtonText}
            </button>
          {/if}
        </div>
      </div>

      {#if myScheduleEvents.length === 0}
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
          >
            <Icon
              icon="mdi:calendar-outline"
              class="w-8 h-8 text-gray-400 dark:text-gray-300"
            />
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No shows selected
          </h3>
          <p class="text-gray-600 dark:text-gray-300">
            Click on any show above to add it to your personal schedule
          </p>
        </div>
      {:else}
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          {#each Object.entries(getMyScheduleEventsByDay()) as [dayName, dayEvents]}
            <!-- Day header -->
            <div
              class="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600"
            >
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDayWithDate(dayName).full}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {dayEvents.length}
                {dayEvents.length === 1 ? "show" : "shows"}
              </p>
            </div>

            <!-- Events for this day -->
            {#each dayEvents as event, index}
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 {index <
                dayEvents.length - 1
                  ? 'border-b border-gray-200 dark:border-gray-600'
                  : ''} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div class="flex-grow pr-3">
                  <div class="flex items-center gap-3 mb-1">
                    <h4
                      class="font-semibold text-base sm:text-lg text-gray-900 dark:text-white"
                    >
                      {event.title}
                    </h4>
                    {#if isCurrentlyPlaying(event)}
                      <span
                        class="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm font-medium"
                      >
                        <span
                          class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full animate-pulse"
                        ></span>
                        <span class="hidden sm:inline">Now Playing</span>
                        <span class="sm:hidden">Live</span>
                      </span>
                    {/if}
                  </div>
                  <div
                    class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span class="font-medium"
                      >{event.startTime} - {event.endTime}</span
                    >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-3 h-3 rounded-full {getStageColor(
                          event.section
                        )}"
                      ></div>
                      <span>{event.section}</span>
                    </div>
                  </div>
                </div>
                <button
                  class="mt-2 sm:mt-0 self-end sm:self-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  on:click={() => toggleEventInSchedule(event)}
                  title="Remove from schedule"
                >
                  <Icon
                    icon="mdi:delete-outline"
                    class="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </button>
              </div>
            {/each}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for better UX */
  :global(.overflow-x-auto::-webkit-scrollbar) {
    height: 8px;
  }

  :global(.overflow-x-auto::-webkit-scrollbar-track) {
    background: #f1f1f1;
  }

  :global(.dark .overflow-x-auto::-webkit-scrollbar-track) {
    background: #374151;
  }

  :global(.overflow-x-auto::-webkit-scrollbar-thumb) {
    background: #888;
    border-radius: 4px;
  }

  :global(.dark .overflow-x-auto::-webkit-scrollbar-thumb) {
    background: #6b7280;
  }

  :global(.overflow-x-auto::-webkit-scrollbar-thumb:hover) {
    background: #555;
  }

  :global(.dark .overflow-x-auto::-webkit-scrollbar-thumb:hover) {
    background: #9ca3af;
  }
</style>
