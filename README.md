# Aurelius Cars

Final project for Web Technologies (Frontend), Astana IT University, group MT-2504.

Aurelius Cars is a made-up car showroom in Astana with Porsche, Mercedes-Benz and Audi models. The website is for people who want to choose a premium car calmly: look through the catalogue, compare prices in dollars, tenge or euro, make a shortlist, check the weather and book a test drive, and keep everything in a personal club profile.

- **Live website:** https://hayrulint.github.io/aurelius-cars/
- **Repository:** https://github.com/hayrulint/aurelius-cars

## Team

| Student | GitHub | Main part |
|---|---|---|
| Tamerlan Khairulin | hayrulint | Catalogue search, brand filter, sorting, saved filters, authentication (sign up, log in, profile), integration, GitHub Pages |
| Zhangir Kadralin | Zhangirmt2504 | Design system, model emblems and brand logos, dark and light mode, responsive layout |
| Feruza Khaissarkyzy | feru1809-prog | Home page, brand marquee, animations (scroll reveal, car drawing, buttons), About page, FAQ |
| Nurasyl Mirambek | mirambeknurasyl-glitch | Form validation, weather API and currency API, testing, report |

## Pages

| Page | What is there |
|---|---|
| `index.html` | Hero, brand marquee, "Select your car by brand" tiles, welcome form, reasons, popular cars, buying steps |
| `services.html` | Catalogue of six cars with search, brand filter, sorting and currency switch; shortlist; comparison table; services |
| `about.html` | Story timeline, animated numbers, team, values |
| `contact.html` | Test drive form, showroom details with a map, 7-day weather forecast, FAQ |
| `register.html` | Sign up for the Aurelius Club |
| `login.html` | Log in |
| `profile.html` | Profile of the logged in member: details (editable), shortlist, test drive requests, log out, delete account |
| `404.html` | "Wrong turn" page that GitHub Pages shows for a wrong address |

## Features

- **Responsive:** Flexbox and CSS Grid (plus Bootstrap CSS for form fields). Checked at 360, 390, 820, 1280 and 1440 px.
- **Light and dark mode:** switch in the header, saved in `localStorage`, applied in `<head>` before the page is drawn, so there is no flash; other open tabs follow the change.
- **Authentication simulation:** sign up saves the user in `localStorage` (the password as a SHA-256 hash), log in checks the email and password and opens the profile, the profile is closed for guests.
- **Form validation:** our own messages under each field for required fields, email format, password length and complexity (with a live checklist and strength bar), Kazakhstan phone pattern, age, dates and times.
- **Search and filtering:** text search, brand buttons and sorting work together; the choice and the currency are saved in `localStorage` and restored after a reload.
- **APIs:** [Open-Meteo](https://open-meteo.com/) weather forecast for Astana on the contact page, [ExchangeRate-API](https://www.exchangerate-api.com/) open rates for prices in KZT and EUR. Both are free and need no key.
- **Animations:** brand marquee, chrome emblem shine, scroll reveal, a car drawn line by line, count-up numbers, button light sweep, heart pop, theme switch icon spin. All of them are switched off when the system asks for reduced motion.
- **Accessibility:** the same navigation on every page, skip link, labels for every field, alt text for every image, H1 → H2 → H3 order, everything works with the Tab key.

## File structure

```
index.html, services.html, about.html, contact.html,
register.html, login.html, profile.html, 404.html
site.webmanifest
css/style.css         all styles, light theme included
css/responsive.css    media queries
css/vendor/           bootstrap.min.css 5.3.3 (only the CSS)
js/script.js          every page: theme, menu, account link, toast, animations
js/auth.js            every page: users, session, validation rules (localStorage)
js/welcome.js         index.html
js/catalogue.js       services.html: filter, sort, currency API, shortlist
js/contact.js         contact.html: test drive form, weather API
js/faq.js             contact.html
js/register.js        register.html
js/login.js           login.html
js/profile.js         profile.html
js/vendor/            jquery-3.7.1.min.js
fonts/                Plus Jakarta Sans (OFL licence)
images/               car photos, model badges, brand logos, favicons, logo
```

## How to open

Open the live link, or download the project and open `index.html` in a browser. The APIs and the map need the internet; everything else works offline.

## Credits

Brand logos: [Simple Icons](https://simpleicons.org/) (CC0); the logos are trademarks of their owners and are shown only to name the brands. Icons: [Lucide](https://lucide.dev/) (ISC). Map: © OpenStreetMap contributors.

## Limitations

There is no server. Accounts, shortlists and test drive requests live only in `localStorage` of this browser, nothing is sent anywhere. The showroom, address and phone number are fictional.
