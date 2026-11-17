// Task 2. FAQ accordion with jQuery slide effects (contact.html).

$(function () {
    const $buttons = $('.faq-toggle');

    // the answers have the hidden attribute in the HTML, so they stay closed even before
    // this script runs; here we swap it for display: none, which slideDown() can animate
    $('.faq-answer').hide().prop('hidden', false);

    $buttons.on('click', function () {
        const $button = $(this);
        const $answer = $('#' + $button.attr('aria-controls'));
        const isOpen = $button.attr('aria-expanded') === 'true';

        $button.attr('aria-expanded', String(!isOpen));
        $button.closest('.faq-item').toggleClass('is-open', !isOpen);

        // stop(true) clears the queue, so ten fast clicks do not create ten animations
        if (isOpen) {
            $answer.stop(true).slideUp(200);
        } else {
            $answer.stop(true).slideDown(250);
        }
    });
});
