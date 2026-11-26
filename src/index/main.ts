import { mount } from 'svelte';
import Index from './Index.svelte';
import '../lib/app.css';

mount(Index, { target: document.getElementById('app')! });
