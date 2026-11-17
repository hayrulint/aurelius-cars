// Authentication simulation with localStorage (the site has no backend).
// Loaded on every page before script.js. The other files use it through window.AureliusAuth:
// script.js for the account link in the menu, register.js, login.js and profile.js for the
// accounts, contact.js for prefilling the form and saving test drive requests.

(function () {
    const USERS_KEY = 'aurelius-users';
    const SESSION_KEY = 'aurelius-session';
    const BOOKINGS_KEY = 'aurelius-bookings';

    // ----- safe storage helpers: private mode or blocked storage must not break the page -----

    function read(storage, key, fallback) {
        try {
            const value = JSON.parse(storage.getItem(key));
            return value === null ? fallback : value;
        } catch (error) {
            return fallback;
        }
    }

    function write(storage, key, value) {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function remove(storage, key) {
        try {
            storage.removeItem(key);
        } catch (error) {
            // nothing to clean up
        }
    }

    // ----- validation rules shared by all forms; each returns an error text or '' -----

    const emailPattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
    const namePattern = /^\p{L}[\p{L}' -]*$/u;

    // "+7 701 234-56-78", "87012345678" and "+7 (701) 234 56 78" are all the same number
    function cleanPhone(value) {
        return value.replace(/[\s()-]/g, '');
    }

    const rules = {
        name: function (value, label) {
            if (value === '') return 'Please enter your ' + label + '.';
            if (value.length < 2) return 'The ' + label + ' must have at least 2 letters.';
            if (!namePattern.test(value)) return 'Use only letters, spaces, hyphens or apostrophes.';
            return '';
        },
        email: function (value) {
            if (value === '') return 'Please enter your email.';
            if (!emailPattern.test(value)) return 'Check the email, it should look like name@example.com.';
            return '';
        },
        phone: function (value) {
            if (value === '') return 'Please enter your phone number.';
            if (/[^\d\s()+-]/.test(value)) return 'Use only digits, spaces, brackets, hyphens and +.';
            if (!/^(\+7|8)\d{10}$/.test(cleanPhone(value))) {
                return 'Enter a Kazakhstan number: +7 and 10 digits, for example +7 701 234 5678.';
            }
            return '';
        },
        // one entry per requirement, so the sign up page can tick them off while the user types
        passwordChecks: function (value) {
            return {
                length: value.length >= 8,
                upper: /[A-Z]/.test(value),
                lower: /[a-z]/.test(value),
                digit: /\d/.test(value),
                symbol: /[^A-Za-z0-9\s]/.test(value)
            };
        },
        password: function (value) {
            if (value === '') return 'Please create a password.';
            if (/\s/.test(value)) return 'The password must not contain spaces.';
            const checks = rules.passwordChecks(value);
            if (!checks.length) return 'The password is too short: at least 8 characters.';
            if (!checks.upper || !checks.lower) return 'Add both capital and small letters.';
            if (!checks.digit) return 'Add at least one digit.';
            if (!checks.symbol) return 'Add at least one symbol, for example ! or #.';
            return '';
        }
    };

    // shows or clears the message under a field and marks the field for screen readers
    function setFieldError($field, message) {
        $('#' + $field.attr('id') + '-error').text(message);
        $field
            .toggleClass('is-invalid', message !== '')
            .toggleClass('is-valid', message === '' && $field.val() !== '')
            .attr('aria-invalid', String(message !== ''));
        return message === '';
    }

    // ----- password hashing: the password is never saved as plain text -----

    async function hashPassword(password) {
        if (window.crypto && window.crypto.subtle) {
            const bytes = new TextEncoder().encode(password);
            const digest = await window.crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest)).map(function (b) {
                return b.toString(16).padStart(2, '0');
            }).join('');
        }
        // very old browsers or a page opened over plain http: weak fallback, still not readable at a glance
        return 'b64:' + btoa(unescape(encodeURIComponent(password)));
    }

    // ----- users -----

    function getUsers() {
        const users = read(localStorage, USERS_KEY, []);
        return Array.isArray(users) ? users : [];
    }

    function findUser(email) {
        const wanted = String(email).trim().toLowerCase();
        return getUsers().find(function (user) {
            return user.email === wanted;
        }) || null;
    }

    function saveUser(user) {
        const users = getUsers().filter(function (item) {
            return item.email !== user.email;
        });
        users.push(user);
        return write(localStorage, USERS_KEY, users);
    }

    function deleteUser(email) {
        write(localStorage, USERS_KEY, getUsers().filter(function (user) {
            return user.email !== email;
        }));
        write(localStorage, BOOKINGS_KEY, getAllBookings().filter(function (booking) {
            return booking.email !== email;
        }));
        logOut();
    }

    // ----- session: localStorage if "keep me logged in", otherwise only until the tab is closed -----

    function logIn(email, remember) {
        logOut();
        write(remember ? localStorage : sessionStorage, SESSION_KEY, { email: email, since: Date.now() });
    }

    function logOut() {
        remove(localStorage, SESSION_KEY);
        remove(sessionStorage, SESSION_KEY);
    }

    function getCurrentUser() {
        const session = read(sessionStorage, SESSION_KEY, null) || read(localStorage, SESSION_KEY, null);
        if (!session || !session.email) {
            return null;
        }
        const user = findUser(session.email);
        if (!user) {
            // the account was deleted in another tab
            logOut();
        }
        return user;
    }

    // ----- test drive requests saved for the profile page -----

    function getAllBookings() {
        const bookings = read(localStorage, BOOKINGS_KEY, []);
        return Array.isArray(bookings) ? bookings : [];
    }

    function getBookings(email) {
        return getAllBookings().filter(function (booking) {
            return booking.email === email;
        });
    }

    function addBooking(booking) {
        const bookings = getAllBookings();
        bookings.push(booking);
        return write(localStorage, BOOKINGS_KEY, bookings);
    }

    function removeBooking(id) {
        write(localStorage, BOOKINGS_KEY, getAllBookings().filter(function (booking) {
            return booking.id !== id;
        }));
    }

    // a short message for the next page, for example "Account created" after the redirect
    function setFlash(message) {
        write(sessionStorage, 'aurelius-flash', message);
    }

    function takeFlash() {
        const message = read(sessionStorage, 'aurelius-flash', '');
        remove(sessionStorage, 'aurelius-flash');
        return message;
    }

    window.AureliusAuth = {
        rules: rules,
        cleanPhone: cleanPhone,
        setFieldError: setFieldError,
        hashPassword: hashPassword,
        findUser: findUser,
        saveUser: saveUser,
        deleteUser: deleteUser,
        logIn: logIn,
        logOut: logOut,
        getCurrentUser: getCurrentUser,
        getBookings: getBookings,
        addBooking: addBooking,
        removeBooking: removeBooking,
        setFlash: setFlash,
        takeFlash: takeFlash
    };
})();
