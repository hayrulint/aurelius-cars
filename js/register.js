// register.html: Sign up (authentication simulation)
// Every field is checked by our own rules with messages under the field.
// A valid form saves the user in localStorage (password as a SHA-256 hash),
// logs the user in and opens the profile page.

$(function () {
    const auth = window.AureliusAuth;
    const $form = $('#register-form');
    const $password = $('#password');
    const $confirm = $('#confirm-password');
    const $summary = $('#register-summary');
    const $strengthBar = $('#strength-bar');
    const thisYear = new Date().getFullYear();

    const rules = {
        'first-name': function (value) {
            return auth.rules.name(value, 'first name');
        },
        'last-name': function (value) {
            return auth.rules.name(value, 'last name');
        },
        'reg-email': function (value) {
            const error = auth.rules.email(value);
            if (error) return error;
            if (auth.findUser(value)) return 'An account with this email already exists. Try to log in.';
            return '';
        },
        'reg-phone': auth.rules.phone,
        'country': function (value) {
            return value === '' ? 'Please choose a country.' : '';
        },
        'birth-year': function (value) {
            if (value === '') return 'Please enter the year of birth.';
            if (!/^\d{4}$/.test(value)) return 'Write the year with four digits, for example 2003.';
            const age = thisYear - Number(value);
            if (age < 18) return 'You must be at least 18 years old to join.';
            if (age > 100) return 'Please check the year.';
            return '';
        },
        'password': auth.rules.password,
        'confirm-password': function (value) {
            if (value === '') return 'Please repeat the password.';
            if (value !== $password.val()) return 'The passwords do not match.';
            return '';
        },
        'terms': function () {
            return $('#terms').is(':checked') ? '' : 'Please tick this box to continue.';
        }
    };

    function checkField($field) {
        // passwords are checked as typed, spaces at the ends are a mistake we want to show
        const raw = $field.val();
        const value = $field.attr('type') === 'password' ? raw : raw.trim();
        return auth.setFieldError($field, rules[$field.attr('id')](value));
    }

    // ----- live password requirements and strength bar -----

    function updatePasswordRules() {
        const checks = auth.rules.passwordChecks($password.val());
        let passed = 0;

        $('#password-rules li').each(function () {
            const ok = checks[$(this).data('rule')];
            $(this).toggleClass('is-met', ok);
            if (ok) passed++;
        });

        const levels = ['', 'is-weak', 'is-weak', 'is-medium', 'is-medium', 'is-strong'];
        $strengthBar
            .removeClass('is-weak is-medium is-strong')
            .addClass(levels[passed])
            .css('width', (passed / 5 * 100) + '%');
    }

    $password.on('input', function () {
        updatePasswordRules();
        // a confirm field that was already filled must be checked again
        if ($confirm.val() !== '') {
            checkField($confirm);
        }
    });

    // after the first try, every field re-checks itself while the user fixes it
    $form.on('input change', '[data-validate]', function () {
        const $field = $(this);
        if ($field.hasClass('is-invalid') || $field.is(':checkbox')) {
            checkField($field);
        }
    });

    // a field is also checked when the user leaves it, but only if something was typed
    $form.on('blur', '[data-validate]', function () {
        const $field = $(this);
        if ($field.val() !== '' && !$field.is(':checkbox')) {
            checkField($field);
        }
    });

    $form.on('submit', async function (event) {
        event.preventDefault();

        let $firstInvalid = null;
        let errors = 0;

        $form.find('[data-validate]').each(function () {
            const $field = $(this);
            if (!checkField($field)) {
                errors++;
                if ($firstInvalid === null) {
                    $firstInvalid = $field;
                }
            }
        });

        if ($firstInvalid !== null) {
            $summary.text(errors === 1
                ? 'One field needs your attention.'
                : errors + ' fields need your attention.').prop('hidden', false);
            $firstInvalid.trigger('focus');
            return;
        }

        $summary.prop('hidden', true);
        const $submit = $form.find('[type="submit"]').prop('disabled', true);

        const user = {
            firstName: $('#first-name').val().trim(),
            lastName: $('#last-name').val().trim(),
            email: $('#reg-email').val().trim().toLowerCase(),
            phone: $('#reg-phone').val().trim(),
            country: $('#country').val(),
            birthYear: Number($('#birth-year').val()),
            gender: $('input[name="gender"]:checked').val() || '',
            interests: $('input[name="interests"]:checked').map(function () {
                return this.value;
            }).get(),
            passwordHash: await auth.hashPassword($password.val()),
            createdAt: new Date().toISOString()
        };

        if (!auth.saveUser(user)) {
            $submit.prop('disabled', false);
            $summary.text('Your browser blocks local storage, so the account cannot be saved. Please allow site data and try again.').prop('hidden', false);
            return;
        }

        auth.logIn(user.email, true);
        auth.setFlash('Welcome to the Aurelius Club, ' + user.firstName + '!');
        window.location.href = 'profile.html';
    });

    $form.on('reset', function () {
        $form.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
        $form.find('[aria-invalid]').attr('aria-invalid', 'false');
        $form.find('.invalid-feedback').text('');
        $summary.prop('hidden', true);
        // the values are cleared after the reset event, so we update the bar a moment later
        setTimeout(updatePasswordRules, 0);
    });

    // a logged in member does not need a second account
    const current = auth.getCurrentUser();
    if (current) {
        $('<p>', { 'class': 'info-note' })
            .html('You are already logged in as <strong></strong>. <a href="profile.html">Open your profile</a> or log out there to create another account.')
            .insertBefore($form)
            .find('strong').text(current.email);
    }
});
