// Shared code for every page: light/dark theme, mobile menu, account link,
// toast messages, password show/hide, brand marquee and scroll animations.
// jQuery and auth.js are loaded before this file, see the bottom of each HTML page.

$(function () {
    const $html = $('html');
    const $themeButton = $('#theme-toggle');
    const $menuButton = $('#menu-toggle');
    const $nav = $('#main-nav');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ----- theme -----
    // the class is already set by the small script in <head> before the page is drawn,
    // here we only sync the switch and handle clicks

    function saveTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            // private mode or blocked storage: the theme still works until reload
        }
    }

    function applyTheme(isLight) {
        $html
            .toggleClass('theme-light', isLight)
            .attr('data-bs-theme', isLight ? 'light' : 'dark');
        $themeButton.attr('aria-checked', String(isLight));
        $('meta[name="theme-color"]').attr('content', isLight ? '#f8fafc' : '#0d0d0d');
    }

    applyTheme($html.hasClass('theme-light'));

    $themeButton.on('click', function () {
        const isLight = !$html.hasClass('theme-light');
        applyTheme(isLight);
        saveTheme(isLight ? 'light' : 'dark');
    });

    // another tab changed the theme: follow it, so all open pages stay the same
    $(window).on('storage', function (event) {
        if (event.originalEvent.key === 'theme') {
            applyTheme(event.originalEvent.newValue === 'light');
        }
    });

    // ----- mobile menu -----

    function isMenuOpen() {
        return $menuButton.attr('aria-expanded') === 'true';
    }

    function closeMenu() {
        $menuButton.attr('aria-expanded', 'false');
        $nav.stop(true).slideUp(200);
    }

    $menuButton.on('click', function () {
        if (isMenuOpen()) {
            closeMenu();
        } else {
            $menuButton.attr('aria-expanded', 'true');
            $nav.stop(true).slideDown(200);
        }
    });

    $(document).on('keydown', function (event) {
        if (event.key === 'Escape' && isMenuOpen()) {
            closeMenu();
            $menuButton.trigger('focus');
        }
    });

    // a click outside the header closes the open menu
    $(document).on('click', function (event) {
        if (isMenuOpen() && !$(event.target).closest('.site-header').length) {
            closeMenu();
        }
    });

    // on desktop the menu is always visible, so the button state is reset
    // and the inline style from slideUp/slideDown is removed
    window.matchMedia('(min-width: 68rem)').addEventListener('change', function (event) {
        if (event.matches) {
            $menuButton.attr('aria-expanded', 'false');
            $nav.stop(true).removeAttr('style');
        }
    });

    // ----- account link: "Log in" for guests, the member's name for logged in users -----

    const currentUser = window.AureliusAuth.getCurrentUser();

    if (currentUser) {
        $('#account-link').attr('href', 'profile.html').addClass('is-member');
        $('#account-label').text(currentUser.firstName);
        $('[data-guest-only]').prop('hidden', true);
    }

    // ----- toast: a short message at the bottom of the screen -----

    const $toast = $('#toast');

    window.showToast = function (message) {
        // stop(true) throws away old animations, so the message never "lags" behind the clicks
        $toast.stop(true).text(message).fadeTo(200, 1).delay(2500).fadeTo(600, 0);
    };

    // a message left by the previous page, for example after a redirect from the sign up form
    const flash = window.AureliusAuth.takeFlash();
    if (flash) {
        window.showToast(flash);
    }

    // ----- show / hide password (sign up and log in) -----

    $('.password-toggle').on('click', function () {
        const $button = $(this);
        const $input = $('#' + $button.attr('aria-controls'));
        const show = $input.attr('type') === 'password';

        $input.attr('type', show ? 'text' : 'password');
        $button.attr('aria-pressed', String(show)).toggleClass('is-showing', show);
        $button.find('.visually-hidden').text(show ? 'Hide password' : 'Show password');
    });

    // ----- brand marquee on the home page -----
    // the second list is a copy of the first one, so the strip can move by exactly 50% and loop

    const $tracks = $('.marquee-track');
    if ($tracks.length === 2) {
        $tracks.eq(1).html($tracks.eq(0).html()).find('img').attr('alt', '');
    }

    // ----- scroll animations -----
    // cards fade in when they come into view; the drawing of the car is drawn line by line

    const $animated = $('.reveal, .car-drawing, [data-count]');

    function countUp(element) {
        const $number = $(element);
        const target = Number($number.data('count'));
        const suffix = $number.data('suffix') || '';

        if (reduceMotion) {
            return;
        }

        $({ value: 0 }).animate({ value: target }, {
            duration: 1400,
            easing: 'swing',
            step: function (now) {
                $number.text(Math.round(now) + suffix);
            },
            complete: function () {
                $number.text(target + suffix);
            }
        });
    }

    function show(element) {
        $(element).addClass('is-visible');
        if (element.hasAttribute('data-count')) {
            countUp(element);
        }
    }

    if ('IntersectionObserver' in window && !reduceMotion) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    show(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        $animated.each(function (index) {
            // cards in one row appear one after another (used by the animation in style.css)
            this.style.setProperty('--reveal-delay', (index % 3) * 90 + 'ms');
            observer.observe(this);
        });
    } else {
        $animated.addClass('is-visible');
    }
});
