// Task 1. Personal welcome message on the home page.

$(function () {
    const $form = $('#welcome-form');
    const $nameInput = $('#visitor-name');
    const $message = $('#welcome-message');
    const defaultText = $message.text();

    $form.on('submit', function (event) {
        event.preventDefault();

        const visitorName = $nameInput.val().trim();

        if (visitorName === '') {
            $message
                .text('Please type your name first, then press the button.')
                .removeClass('is-greeted')
                .addClass('is-error');
            $nameInput.trigger('focus');
            return;
        }

        // .text() puts the name in as plain text, so tags typed in the field are not executed
        $message
            .text('Welcome to Aurelius Cars, ' + visitorName + '! Start with the catalogue or book a test drive.')
            .removeClass('is-error')
            .addClass('is-greeted');
    });

    // as soon as the visitor starts typing again, the red warning goes away
    $nameInput.on('input', function () {
        if ($message.hasClass('is-error') && $nameInput.val().trim() !== '') {
            $message.text(defaultText).removeClass('is-error');
        }
    });
});
