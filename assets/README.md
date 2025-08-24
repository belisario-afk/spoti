Place your splash image file here with the exact name:

A closed double door.png

Notes:
- The splash shows one image perfectly split across two doors. We achieve this by using the same image on both panels with `background-size: 200% 100%`, then `background-position: left center` and `right center`.
- If you want to rename the file, update:
  - index.html preload link
  - styles.css `--door-image` default
  - app.js `DOOR_IMG_URL`