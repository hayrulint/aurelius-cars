// profile.html: shows the data of the logged in user (authentication simulation).
// Guests are sent to the log in page. The member can edit the name and phone,
// see the shortlist and test drive requests, log out or delete the account.

$(function () {
    const auth = window.AureliusAuth;
    let user = auth.getCurrentUser();

    if (!user) {
        // replace() so the Back button does not return to the empty profile
        window.location.replace('login.html?next=profile.html');
        return;
    }

    // ----- personal details -----

    function showDetails() {
        const initials = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
        const since = new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        $('#profile-avatar').text(initials);
        $('#profile-first-name').text(user.firstName);
        $('#profile-since').text('Member since ' + since);
        $('#pd-name').text(user.firstName + ' ' + user.lastName);
        $('#pd-email').text(user.email);
        $('#pd-phone').text(user.phone);
        $('#pd-country').text(user.country);
        $('#pd-birth').text(user.birthYear || 'Not given');
        $('#pd-gender').text(user.gender || 'Not given');
        $('#pd-interests').text(user.interests && user.interests.length ? user.interests.join(', ') : 'Not chosen');
        $('#account-label').text(user.firstName);
        document.title = user.firstName + ' ' + user.lastName + ' | Aurelius Cars';
    }

    showDetails();

    // ----- edit form -----

    const $editForm = $('#edit-form');
    const $editToggle = $('#edit-toggle');
    const $details = $('.profile-details');

    const rules = {
        'edit-first': function (value) { return auth.rules.name(value, 'first name'); },
        'edit-last': function (value) { return auth.rules.name(value, 'last name'); },
        'edit-phone': auth.rules.phone
    };

    function checkField($field) {
        return auth.setFieldError($field, rules[$field.attr('id')]($field.val().trim()));
    }

    function openEdit(open) {
        $editToggle.attr('aria-expanded', String(open));
        $editToggle.find('span').text(open ? 'Close' : 'Edit');
        $details.prop('hidden', open);
        $editForm.prop('hidden', !open);

        if (open) {
            $('#edit-first').val(user.firstName).trigger('focus');
            $('#edit-last').val(user.lastName);
            $('#edit-phone').val(user.phone);
        } else {
            $editForm.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
            $editForm.find('.invalid-feedback').text('');
        }
    }

    $editToggle.on('click', function () {
        openEdit($editToggle.attr('aria-expanded') !== 'true');
    });

    $('#edit-cancel').on('click', function () {
        openEdit(false);
        $editToggle.trigger('focus');
    });

    $editForm.on('input', '[data-validate]', function () {
        if ($(this).hasClass('is-invalid')) {
            checkField($(this));
        }
    });

    $editForm.on('submit', function (event) {
        event.preventDefault();

        let $firstInvalid = null;
        $editForm.find('[data-validate]').each(function () {
            if (!checkField($(this)) && $firstInvalid === null) {
                $firstInvalid = $(this);
            }
        });
        if ($firstInvalid) {
            $firstInvalid.trigger('focus');
            return;
        }

        user.firstName = $('#edit-first').val().trim();
        user.lastName = $('#edit-last').val().trim();
        user.phone = $('#edit-phone').val().trim();
        auth.saveUser(user);

        showDetails();
        openEdit(false);
        $editToggle.trigger('focus');
        window.showToast('Your details were saved.');
    });

    // ----- shortlist from the catalogue page -----

    const $shortlist = $('#profile-shortlist');

    function readShortlist() {
        try {
            const saved = JSON.parse(localStorage.getItem('aurelius-shortlist'));
            return Array.isArray(saved) ? saved.filter(function (item) { return typeof item === 'string'; }) : [];
        } catch (error) {
            return [];
        }
    }

    function showShortlist() {
        const items = readShortlist();
        $shortlist.empty();
        items.forEach(function (text) {
            $('<li>')
                .append($('<span>').text(text))
                .append($('<button>', {
                    type: 'button',
                    'class': 'remove-button',
                    'data-item': text,
                    'aria-label': 'Remove ' + text + ' from the shortlist'
                }).text('Remove'))
                .appendTo($shortlist);
        });
        $('#profile-shortlist-empty').prop('hidden', items.length > 0);
    }

    $shortlist.on('click', '.remove-button', function () {
        const text = String($(this).data('item'));
        try {
            localStorage.setItem('aurelius-shortlist', JSON.stringify(readShortlist().filter(function (item) {
                return item !== text;
            })));
        } catch (error) {
            return;
        }
        showShortlist();
        window.showToast('Removed from your shortlist: ' + text);
    });

    showShortlist();

    // ----- test drive requests -----

    const $drives = $('#profile-drives');

    function showDrives() {
        const bookings = auth.getBookings(user.email).sort(function (a, b) {
            return (a.date + a.time).localeCompare(b.date + b.time);
        });
        const now = new Date();
        // local date, toISOString() would give yesterday in the early morning in Astana (UTC+5)
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        $drives.empty();
        bookings.forEach(function (booking) {
            const day = new Date(booking.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const past = booking.date < today;
            const $item = $('<li>', { 'class': 'drive-item' + (past ? ' is-past' : '') });
            const $info = $('<div>');

            $('<img>', {
                src: 'images/' + booking.carId + '.jpg',
                alt: booking.car,
                width: 96,
                height: 72,
                loading: 'lazy'
            }).appendTo($item);
            $('<h3>').text(booking.car).appendTo($info);
            $('<p>').text(day + ' at ' + booking.time + (past ? ' (past)' : '')).appendTo($info);
            if (booking.message) {
                $('<p>', { 'class': 'drive-note' }).text('“' + booking.message + '”').appendTo($info);
            }
            $info.appendTo($item);
            $('<button>', {
                type: 'button',
                'class': 'remove-button',
                'data-id': booking.id,
                'aria-label': 'Cancel the test drive of the ' + booking.car + ' on ' + day
            }).text('Cancel').appendTo($item);
            $item.appendTo($drives);
        });

        $('#profile-drives-empty').prop('hidden', bookings.length > 0);
    }

    $drives.on('click', '.remove-button', function () {
        auth.removeBooking(String($(this).data('id')));
        showDrives();
        window.showToast('The test drive request was cancelled.');
    });

    showDrives();

    // ----- log out and delete -----

    $('#logout-button').on('click', function () {
        auth.logOut();
        auth.setFlash('You have logged out. See you soon!');
        window.location.href = 'login.html';
    });

    // two clicks instead of a confirm() window: the first click asks, the second deletes
    const $delete = $('#delete-account');
    const $deleteText = $('#delete-confirm-text');
    let deleteTimer = null;

    $delete.on('click', function () {
        if (!$delete.hasClass('is-confirming')) {
            $delete.addClass('is-confirming');
            $deleteText.text('Press the button again within 5 seconds to delete the account.');
            deleteTimer = setTimeout(function () {
                $delete.removeClass('is-confirming');
                $deleteText.text('');
            }, 5000);
            return;
        }

        clearTimeout(deleteTimer);
        auth.deleteUser(user.email);
        auth.setFlash('Your account was deleted.');
        window.location.href = 'register.html';
    });

    // the shortlist can change in another tab (the catalogue page), keep the profile in sync
    $(window).on('storage', function (event) {
        const key = event.originalEvent.key;
        if (key === 'aurelius-shortlist') {
            showShortlist();
        } else if (key === 'aurelius-bookings') {
            showDrives();
        }
    });
});
