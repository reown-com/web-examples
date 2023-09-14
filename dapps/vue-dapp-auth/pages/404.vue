<template>
  <div class="tw-h-full tw-flex tw-items-center tw-justify-center">
    <div class="tw-items-baseline tw-divide-x tw-divide-base tw-divide-opacity-muted tw-gap-4">
      <div class="status-code tw-px-3">
        404
      </div>
      <h2 class="tw-px-3 tw-font-thin">
        Not found
      </h2>
    </div>
  </div>
</template>

<style lang="css">
  .status-code {
    @apply tw-h1 tw-text-accent-primary tw-bg-no-repeat tw-relative;
    background: url('/img/auth.png');
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    background-size: 200%;
    background-position: center center;
    filter: drop-shadow(0 0 6px var(--c-accent-secondary));
    &::after {
      @apply tw-absolute tw-blur-xs tw-opacity-muted tw-top-0 tw-left-1/2 tw--translate-x-1/2 tw-text-accent-primary;
      content: "404";
    }
  }
</style>
