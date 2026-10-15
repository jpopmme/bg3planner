<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppFooter from './components/AppFooter.vue';
import AppNotices from './components/AppNotices.vue';
import DetailsCard from './components/DetailsCard.vue';
import { useLinkRouting } from './lib/link-routing';

useLinkRouting();
</script>

<template>
  <AppNotices />
  <RouterView />
  <AppFooter />
  <DetailsCard />
</template>
