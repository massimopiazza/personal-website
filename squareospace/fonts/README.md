# Website fonts

These are unchanged copies of the two Google Fonts files previously used by the website. They are served as static assets; no font API, build step, or runtime proxy is required.

- `space-grotesk-v21.woff`: [original file](https://fonts.gstatic.com/s/spacegrotesk/v21/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUXskPMZBSSJLm2E.woff); copyright and SIL Open Font License in `space-grotesk-OFL.txt`.
- `inter-v18.woff2`: [original file](https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2); copyright and SIL Open Font License in `inter-OFL.txt`.

The licence files come from the corresponding [Space Grotesk](https://github.com/google/fonts/tree/main/ofl/spacegrotesk) and [Inter](https://github.com/google/fonts/tree/main/ofl/inter) directories in Google's fonts repository. Keep them with the font files when distributing the site.

If replacing a font, use a new filename and update its URL in `css/style.css` so cached copies are not reused accidentally.
