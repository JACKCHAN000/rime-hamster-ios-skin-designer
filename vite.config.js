import {defineConfig} from 'vite';
import {SITE_INFO} from './src/site-info.js';

export default defineConfig(({command,isPreview})=>({
  base:command==='build'||isPreview?SITE_INFO.basePath:'/',
}));
