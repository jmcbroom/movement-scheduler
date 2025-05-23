<script lang="ts">
  import Schedule from "$lib/components/Schedule.svelte";
  import Icon from "@iconify/svelte";

  export let data;

  let activeView: "grid" | "timeline" = "grid";
</script>

<main class="container mx-auto py-8">
  {#if data.markwhenContent}
    <!-- Content -->
    <Schedule
      markwhenContent={data.markwhenContent}
      {activeView}
      on:viewChange={(e) => (activeView = e.detail)}
    />
  {:else}
    <div class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"
        ></div>
        <p class="mt-4 text-gray-600">Loading schedule...</p>
      </div>
    </div>
  {/if}

  <!-- Footer -->
  <footer class="mt-16 pt-8 pb-6">
    <div class="text-center flex items-center justify-center gap-8">
      <p class="text-sm text-gray-600">
        have a great time and be safe
      </p>
      <a
        href="https://github.com/jmcbroom/movement-scheduler"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        title="View source on GitHub"
      >
        <Icon icon="mdi:github" class="w-5 h-5" />
        <span class="text-sm font-medium">View on GitHub</span>
      </a>
    </div>
  </footer>
</main>
