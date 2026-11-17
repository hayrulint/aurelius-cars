// contact.html
// 1. Test drive form validation, the request is saved in the profile if the visitor is logged in
// 2. Weather forecast for Astana from the Open-Meteo API (no key needed)

$(function () {
    const auth = window.AureliusAuth;
    const $form = $('#test-drive-form');
    const $success = $('#form-success');
    const $successText = $('#form-success-text');
    const $successNote = $('#form-success-note');
    const $message = $('#td-message');
    const $messageCount = $('#message-count');

    // dates as "YYYY-MM-DD" in local time, the same format as the date input
    function toDateValue(date) {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    }

    // the earliest day for a test drive is tomorrow, the latest is in three months
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const lastDay = new Date();
    lastDay.setMonth(lastDay.getMonth() + 3);
    const minDate = toDateValue(tomorrow);
    const maxDate = toDateValue(lastDay);
    $('#td-date').attr({ min: minDate, max: maxDate });

    // "Book a test drive" on a car card opens contact.html?car=porsche-911
    const carFromLink = new URLSearchParams(window.location.search).get('car');
    if (carFromLink && $('#td-car option').filter(function () { return this.value === carFromLink; }).length) {
        $('#td-car').val(carFromLink);
    }

    // a logged in member does not need to type the contact details again
    function prefill() {
        const user = auth.getCurrentUser();
        if (user) {
            $('#td-name').val(user.firstName + ' ' + user.lastName);
            $('#td-email').val(user.email);
            $('#td-phone').val(user.phone);
        }
    }
    prefill();

    // one rule per field, each returns an error text or '' if the value is fine
    const rules = {
        'td-name': function (value) {
            return auth.rules.name(value, 'name');
        },
        'td-email': auth.rules.email,
        'td-phone': auth.rules.phone,
        'td-car': function (value) {
            return value === '' ? 'Please choose a car for the test drive.' : '';
        },
        'td-date': function (value) {
            if (value === '') return 'Please choose a day.';
            if (value < minDate) return 'The earliest day for a test drive is tomorrow.';
            if (value > maxDate) return 'We plan test drives up to three months ahead.';
            if (new Date(value + 'T12:00').getDay() === 0) {
                return 'The showroom is closed on Sunday, please choose another day.';
            }
            return '';
        },
        'td-time': function (value) {
            if (value === '') return 'Please choose a time.';
            const day = $('#td-date').val();
            // on Saturday the showroom closes at 18:00
            if (day && new Date(day + 'T12:00').getDay() === 6 && value === '18:00') {
                return 'On Saturday the last test drive starts at 16:00.';
            }
            return '';
        }
    };

    function checkField($field) {
        return auth.setFieldError($field, rules[$field.attr('id')]($field.val().trim()));
    }

    function formatDay(value) {
        return new Date(value + 'T12:00').toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }

    $form.on('submit', function (event) {
        event.preventDefault();

        let $firstInvalid = null;

        $form.find('[data-validate]').each(function () {
            const $field = $(this);
            if (!checkField($field) && $firstInvalid === null) {
                $firstInvalid = $field;
            }
        });

        if ($firstInvalid !== null) {
            $success.stop(true, true).prop('hidden', true);
            $firstInvalid.trigger('focus');
            return;
        }

        const name = $('#td-name').val().trim();
        const car = $('#td-car option:selected').text();
        const day = formatDay($('#td-date').val());
        const time = $('#td-time').val();
        const user = auth.getCurrentUser();

        $successText.text('Thank you, ' + name + '. A test drive of the ' + car +
            ' on ' + day + ' at ' + time + ' would be possible.');

        if (user) {
            auth.addBooking({
                id: String(Date.now()),
                email: user.email,
                car: car,
                carId: $('#td-car').val(),
                date: $('#td-date').val(),
                time: time,
                message: $message.val().trim().slice(0, 500),
                createdAt: new Date().toISOString()
            });
            $successNote.html('Demo only: nothing was sent to the showroom. The request is saved in <a href="profile.html">your profile</a>.');
        } else {
            $successNote.html('Demo only: nothing was sent to the showroom. <a href="login.html?next=contact.html">Log in</a> or <a href="register.html">sign up</a> to keep your requests in a profile.');
        }

        $success.stop(true, true).prop('hidden', false).hide().fadeIn(300, function () {
            $success.trigger('focus');
        });

        // start a clean form for the next request, a member keeps the contact details
        this.reset();
        $form.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
        $form.find('[aria-invalid]').attr('aria-invalid', 'false');
        $messageCount.text('0');
        $('#td-date-weather').prop('hidden', true);
        prefill();
    });

    // after the first try, every field re-checks itself while the user fixes it
    $form.on('input change', '[data-validate]', function () {
        const $field = $(this);
        if ($field.hasClass('is-invalid')) {
            checkField($field);
        }
    });

    // the time depends on the day (Saturday), so a wrong time is checked again when the day changes
    $('#td-date').on('change', function () {
        const $time = $('#td-time');
        if ($time.val() !== '') {
            checkField($time);
        }
        showDateWeather($(this).val());
    });

    $message.on('input', function () {
        $messageCount.text($message.val().length);
    });

    // ===== Weather API =====

    const $weatherList = $('#weather-list');
    const $weatherStatus = $('#weather-status');
    const $dateWeather = $('#td-date-weather');
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=51.1694&longitude=71.4491' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
        '&timezone=Asia%2FAlmaty&forecast_days=16';
    let forecast = {};

    // WMO weather codes from the Open-Meteo documentation, grouped into what a driver cares about
    function describe(code) {
        if (code === 0) return { text: 'Clear sky', icon: 'sun' };
        if (code <= 2) return { text: 'Partly cloudy', icon: 'cloud-sun' };
        if (code === 3) return { text: 'Cloudy', icon: 'cloud' };
        if (code <= 48) return { text: 'Fog', icon: 'cloud-fog' };
        if (code <= 57) return { text: 'Drizzle', icon: 'cloud-drizzle' };
        if (code <= 67 || (code >= 80 && code <= 82)) return { text: 'Rain', icon: 'cloud-rain' };
        if (code <= 77 || code === 85 || code === 86) return { text: 'Snow', icon: 'cloud-snow' };
        return { text: 'Thunderstorm', icon: 'cloud-lightning' };
    }

    // the icons are kept in the page as hidden <template>s, so we do not need an icon font
    function iconHtml(name) {
        const template = document.getElementById('icon-' + name);
        return template ? template.innerHTML : '';
    }

    function temp(value) {
        // a real minus sign looks better than a hyphen next to the numbers
        return String(Math.round(value)).replace('-', '−') + '°';
    }

    function drivingTip(day) {
        if (day.code >= 71 && day.code <= 86) return 'Snow: the G 63 or the Taycan 4S with winter tyres.';
        if (day.max <= -15) return 'Very cold: the cars wait in a warm showroom.';
        if (day.code >= 51) return 'Wet roads: we drive carefully and use the city route.';
        if (day.max >= 15 && day.code <= 2) return 'Perfect day for the 718 Spyder with the roof down.';
        return 'Good day for any car.';
    }

    function showDateWeather(value) {
        const day = forecast[value];
        if (!day) {
            $dateWeather.prop('hidden', true);
            return;
        }
        $dateWeather
            .html(iconHtml(day.icon))
            .append($('<span>').text('Forecast: ' + day.text.toLowerCase() + ', ' + temp(day.min) + ' to ' + temp(day.max) + 'C. ' + drivingTip(day)))
            .prop('hidden', false);
    }

    async function loadWeather() {
        $weatherStatus.text('Loading the forecast…').prop('hidden', false);
        $weatherList.attr('aria-busy', 'true');

        try {
            const response = await fetch(weatherUrl);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            const data = await response.json();
            const daily = data.daily;

            forecast = {};
            $weatherList.empty();

            daily.time.forEach(function (date, i) {
                const info = describe(daily.weather_code[i]);
                const day = {
                    code: daily.weather_code[i],
                    text: info.text,
                    icon: info.icon,
                    max: daily.temperature_2m_max[i],
                    min: daily.temperature_2m_min[i],
                    rain: daily.precipitation_probability_max[i],
                    wind: daily.wind_speed_10m_max[i]
                };
                forecast[date] = day;

                // the cards show the first seven days, the date field can use all sixteen
                if (i >= 7) {
                    return;
                }

                const sunday = new Date(date + 'T12:00').getDay() === 0;
                const label = i === 0 ? 'Today' : new Date(date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                const $item = $('<li>', { 'class': 'weather-day' + (sunday ? ' is-closed' : '') });

                $('<p>', { 'class': 'weather-date' }).text(label).appendTo($item);
                $('<span>', { 'class': 'weather-icon' }).html(iconHtml(day.icon)).appendTo($item);
                $('<p>', { 'class': 'weather-temp' }).text(temp(day.max) + ' / ' + temp(day.min)).appendTo($item);
                $('<p>', { 'class': 'weather-text' }).text(day.text).appendTo($item);
                $('<p>', { 'class': 'weather-extra' }).text('Rain ' + (day.rain ?? 0) + '% · wind ' + Math.round(day.wind) + ' km/h').appendTo($item);
                if (sunday) {
                    $('<p>', { 'class': 'weather-closed' }).text('Showroom closed').appendTo($item);
                } else if (i > 0) {
                    $('<button>', { type: 'button', 'class': 'weather-pick', 'data-date': date }).text('Choose this day').appendTo($item);
                }
                $item.appendTo($weatherList);
            });

            $weatherStatus.prop('hidden', true);
            showDateWeather($('#td-date').val());
        } catch (error) {
            $weatherStatus.text('The forecast could not be loaded. Check the internet connection and press Refresh.');
        } finally {
            $weatherList.attr('aria-busy', 'false');
        }
    }

    // "Choose this day" puts the date into the form and moves the visitor there
    $weatherList.on('click', '.weather-pick', function () {
        const $date = $('#td-date');
        $date.val($(this).data('date')).trigger('change');
        if ($date.hasClass('is-invalid')) {
            checkField($date);
        }
        document.getElementById('test-drive').scrollIntoView();
        $date.trigger('focus');
        window.showToast('Day chosen: ' + formatDay($date.val()));
    });

    $('#weather-refresh').on('click', function () {
        const $icon = $(this).find('svg');
        $icon.addClass('is-spinning').one('animationend', function () {
            $icon.removeClass('is-spinning');
        });
        loadWeather();
    });

    loadWeather();
});
