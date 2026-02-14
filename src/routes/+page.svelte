<script lang="ts">
	import PhaserGame, { type TPhaserRef } from '../PhaserGame.svelte';
	import type { Scene } from 'phaser';

	let phaserRef: TPhaserRef = { game: null, scene: null };

	const currentScene = (_scene: Scene) => {
		// hook for future Svelte UI overlays
	};
</script>

<div id="app">
	<PhaserGame bind:phaserRef currentActiveScene={currentScene} />
</div>

<style>
	#app {
		width: 100%;
		height: 100vh;
		overflow: hidden;
		display: flex;
		justify-content: center;
		align-items: center;
		background: #1a1a2e;
	}
</style>
