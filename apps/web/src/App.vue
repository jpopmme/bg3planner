<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppNotices from './components/AppNotices.vue';
import { useLinkRouting } from './lib/link-routing';

useLinkRouting();
</script>

<template>
  <AppNotices />
  <RouterView />
</template>
