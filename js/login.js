// login.html: Log in (authentication simulation)
// The email and password are checked against the accounts saved by the sign up page.
// After a successful log in the visitor goes to the profile page (or back to the page
// that sent them here, for example login.html?next=contact.html).

$(function () {
    const auth = window.AureliusAuth;
    const $form = $('#login-form');
    const $email = $('#login-email');
    const $password = $('#login-password');
    const $summary = $('#login-summary');
    const $info = $('#login-info');

    // only our own pages are allowed as "next", so the link cannot send the user to another site
    const nextParam = new URLSearchParams(window.location.search).get('next') || '';
    const nextPage = /^[a-z0-9-]+\.html$/.test(nextParam) ? nextParam : 'profile.html';

    const rules = {
        'login-email': auth.rules.email,
        'login-password': function (value) {
            return value === '' ? 'Please enter your password.' : '';
        }
    };

    function checkField($field) {
        const raw = $field.val();
        const value = $field.attr('type') === 'email' ? raw.trim() : raw;
        return auth.setFieldError($field, rules[$field.attr('id')](value));
    }

    $form.on('input', '[data-validate]', function () {
        $summary.prop('hidden', true);
        const $field = $(this);
        if ($field.hasClass('is-invalid')) {
            checkField($field);
        }
    });

    $form.on('submit', async function (event) {
        event.preventDefault();

        const emailOk = checkField($email);
        const passwordOk = checkField($password);

        if (!emailOk || !passwordOk) {
            (emailOk ? $password : $email).trigger('focus');
            return;
        }

        const user = auth.findUser($email.val());
        const hash = await auth.hashPassword($password.val());

        // the same message for a wrong email and a wrong password, so nobody can guess
        // which emails have an account
        if (!user || user.passwordHash !== hash) {
            $summary.text('The email or password is incorrect. Check them or create a new account.').prop('hidden', false);
            $password.val('').addClass('is-invalid').attr('aria-invalid', 'true').trigger('focus');
            return;
        }

        auth.logIn(user.email, $('#remember-me').is(':checked'));
        auth.setFlash('Welcome back, ' + user.firstName + '!');
        window.location.href = nextPage;
    });

    // messages for visitors who were sent here by another page
    const current = auth.getCurrentUser();
    if (current) {
        $info.html('You are already logged in as <strong></strong>. <a href="profile.html">Open your profile</a>.')
            .prop('hidden', false)
            .find('strong').text(current.email);
    } else if (nextParam === 'profile.html') {
        $info.text('Please log in to open your profile.').prop('hidden', false);
    }
});
