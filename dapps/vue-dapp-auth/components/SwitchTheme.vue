<template>
  <lib-radio
    v-model="$colorMode.preference"
    :options="themeModes"
  >
    <template #option="{ option, checked }">
      <a
        v-if="option === 'system'"
        role="button"
        class="tw-radio-option"
        :class="{ checked }"
      >
        <icon name="desktop" />
      </a>
      <a
        v-else-if="option === 'light'"
        role="button"
        class="tw-radio-option"
        :class="{ checked }"
      >
        <icon name="sun" class="tw-scale-[1.2]" />
      </a>
      <a
        v-else-if="option === 'dark'"
        role="button"
        class="tw-radio-option"
        :class="{ checked }"
      >
        <icon name="moon" />
      </a>
    </template>
  </lib-radio>
</template>
