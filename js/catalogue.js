// services.html
// 1. Search, brand filter and sorting of the catalogue, the choice is saved in localStorage
// 2. Prices in USD, KZT or EUR with live exchange rates from a public API
// 3. Shortlist with Add / Remove (delegated events), saved in localStorage

$(function () {

    // ===== 1. Search, brand filter and sorting =====

    const $search = $('#car-search');
    const $sort = $('#car-sort');
    const $filterButtons = $('#brand-filter .filter-button');
    const $list = $('#car-list');
    const $cards = $list.children('.car-card');
    const $resultCount = $('#result-count');
    const $noResults = $('#no-results');
    const filtersKey = 'aurelius-catalogue-filters';
    let activeBrand = 'all';

    function saveFilters() {
        try {
            localStorage.setItem(filtersKey, JSON.stringify({
                query: $search.val(),
                brand: activeBrand,
                sort: $sort.val()
            }));
        } catch (error) {
            // storage is blocked: the filter still works on this page
        }
    }

    function loadFilters() {
        try {
            return JSON.parse(localStorage.getItem(filtersKey)) || {};
        } catch (error) {
            return {};
        }
    }

    function setBrand(brand) {
        const $button = $filterButtons.filter('[data-brand="' + brand + '"]');
        if (!$button.length) {
            return;
        }
        activeBrand = brand;
        $filterButtons.removeClass('is-active').attr('aria-pressed', 'false');
        $button.addClass('is-active').attr('aria-pressed', 'true');
    }

    // the cards are moved inside the grid in the chosen order, the HTML order is "Recommended"
    function sortCars() {
        const order = $sort.val();
        const sorted = $cards.get().sort(function (a, b) {
            const $a = $(a);
            const $b = $(b);
            if (order === 'price-asc') return $a.data('price') - $b.data('price');
            if (order === 'price-desc') return $b.data('price') - $a.data('price');
            if (order === 'hp-desc') return $b.data('hp') - $a.data('hp');
            return $a.data('order') - $b.data('order');
        });
        $list.append(sorted);
    }

    function filterCars() {
        const query = $search.val().trim().toLowerCase();
        let visible = 0;

        $cards.each(function () {
            const $card = $(this);
            const text = ($card.find('h3').text() + ' ' + $card.data('type')).toLowerCase();
            const brandOk = activeBrand === 'all' || $card.data('brand') === activeBrand;
            const textOk = text.indexOf(query) !== -1;
            const match = brandOk && textOk;

            $card.toggle(match);

            if (match) {
                visible++;
            }
        });

        $resultCount.text('Showing ' + visible + ' of ' + $cards.length + ' cars');
        $noResults.prop('hidden', visible !== 0);
        saveFilters();
    }

    $search.on('input', filterCars);

    $sort.on('change', function () {
        sortCars();
        saveFilters();
    });

    $('#brand-filter').on('click', '.filter-button', function () {
        setBrand($(this).data('brand'));
        filterCars();
    });

    $('#reset-filters').on('click', function () {
        $search.val('');
        setBrand('all');
        filterCars();
        $search.trigger('focus');
    });

    // ===== 2. Currency with live exchange rates =====

    const $currencyButtons = $('#currency-switch .segmented-button');
    const $rateNote = $('#rate-note');
    const ratesKey = 'aurelius-rates';
    const currencyKey = 'aurelius-currency';
    const symbols = { USD: '$', EUR: '€', KZT: '₸' };
    let rates = null;

    function formatMoney(usd, currency) {
        if (currency === 'USD' || !rates) {
            return '$' + usd.toLocaleString('en-US');
        }
        // KZT is rounded to thousands and EUR to hundreds, like real price tags
        const step = currency === 'KZT' ? 1000 : 100;
        const value = Math.round(usd * rates[currency] / step) * step;
        return currency === 'KZT'
            ? value.toLocaleString('en-US') + ' ' + symbols.KZT
            : symbols.EUR + value.toLocaleString('en-US');
    }

    function showPrices(currency) {
        $('.money').each(function () {
            const $money = $(this);
            $money.text(formatMoney(Number($money.data('usd')), currency));
        });

        $currencyButtons.removeClass('is-active').attr('aria-pressed', 'false');
        $currencyButtons.filter('[data-currency="' + currency + '"]').addClass('is-active').attr('aria-pressed', 'true');

        if (currency === 'USD') {
            $rateNote.text('Prices in US dollars.');
        } else {
            $rateNote.text('1 USD = ' + rates[currency].toLocaleString('en-US', { maximumFractionDigits: 2 }) +
                ' ' + currency + ', rate from ' + rates.date + ' (ExchangeRate-API).');
        }
    }

    // rates are kept for 6 hours, so the API is not called on every page load
    async function getRates() {
        try {
            const cached = JSON.parse(localStorage.getItem(ratesKey));
            if (cached && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) {
                return cached;
            }
        } catch (error) {
            // no cache, load fresh rates
        }

        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        const data = await response.json();
        if (data.result !== 'success') {
            throw new Error('API error');
        }

        const fresh = {
            KZT: data.rates.KZT,
            EUR: data.rates.EUR,
            date: new Date(data.time_last_update_unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
            savedAt: Date.now()
        };
        try {
            localStorage.setItem(ratesKey, JSON.stringify(fresh));
        } catch (error) {
            // the rates still work on this page
        }
        return fresh;
    }

    async function changeCurrency(currency) {
        if (currency !== 'USD' && !rates) {
            $rateNote.text('Loading exchange rates…');
            $currencyButtons.prop('disabled', true);
            try {
                rates = await getRates();
            } catch (error) {
                $currencyButtons.prop('disabled', false);
                $rateNote.text('Could not load the exchange rates, please check the internet connection. Prices stay in US dollars.');
                return;
            }
            $currencyButtons.prop('disabled', false);
        }

        showPrices(currency);
        try {
            localStorage.setItem(currencyKey, currency);
        } catch (error) {
            // not saved, but shown
        }
    }

    $('#currency-switch').on('click', '.segmented-button', function () {
        changeCurrency($(this).data('currency'));
    });

    // ===== 3. Shortlist =====

    const $shortlist = $('#shortlist');
    const $form = $('#shortlist-form');
    const $input = $('#shortlist-input');
    const $error = $('#shortlist-error');
    const $count = $('#shortlist-count');
    const $empty = $('#shortlist-empty');
    const storageKey = 'aurelius-shortlist';

    function getItems() {
        return $shortlist.find('.shortlist-text').map(function () {
            return $(this).text();
        }).get();
    }

    function findItem(text) {
        const wanted = text.toLowerCase();

        return $shortlist.children('li').filter(function () {
            return $(this).find('.shortlist-text').text().toLowerCase() === wanted;
        });
    }

    function saveItems() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(getItems()));
        } catch (error) {
            // storage is blocked: the list still works on this page
        }
    }

    function loadItems() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    function addItem(text) {
        const $label = $('<span>', { 'class': 'shortlist-text' }).text(text);
        const $remove = $('<button>', {
            type: 'button',
            'class': 'remove-button',
            'aria-label': 'Remove ' + text + ' from the shortlist'
        }).text('Remove');

        $('<li>').append($label, $remove).appendTo($shortlist);
    }

    // after every change: counter, empty message, buttons on the cards and the saved copy
    function updateShortlist() {
        const total = $shortlist.children('li').length;

        $count.text(total === 1 ? '1 item' : total + ' items');
        $empty.prop('hidden', total !== 0);

        $('.add-to-shortlist').each(function () {
            const $button = $(this);
            const added = findItem($button.data('car')).length > 0;

            $button
                .toggleClass('is-added', added)
                .attr('aria-pressed', String(added))
                .find('span').text(added ? 'In your shortlist' : 'Add to shortlist');
        });

        saveItems();
    }

    function showError(message) {
        $error.text(message).prop('hidden', false);
        $input.addClass('is-invalid').attr('aria-invalid', 'true');
    }

    function hideError() {
        $error.text('').prop('hidden', true);
        $input.removeClass('is-invalid').attr('aria-invalid', 'false');
    }

    $form.on('submit', function (event) {
        event.preventDefault();

        const text = $input.val().trim();

        if (text === '') {
            showError('Please write a car or a question first.');
            $input.trigger('focus');
            return;
        }

        if (findItem(text).length > 0) {
            showError('"' + text + '" is already in your shortlist.');
            $input.trigger('focus');
            return;
        }

        hideError();
        addItem(text);
        updateShortlist();
        window.showToast('Added to your shortlist: ' + text);
        $input.val('').trigger('focus');
    });

    $input.on('input', function () {
        if ($input.val().trim() !== '') {
            hideError();
        }
    });

    // delegated handler: works for items that are added later
    $shortlist.on('click', '.remove-button', function () {
        const $item = $(this).closest('li');
        const text = $item.find('.shortlist-text').text();
        const $next = $item.next().length ? $item.next() : $item.prev();

        $item.remove();
        updateShortlist();
        window.showToast('Removed from your shortlist: ' + text);

        // keep the keyboard focus inside the list instead of losing it
        if ($next.length) {
            $next.find('.remove-button').trigger('focus');
        } else {
            $input.trigger('focus');
        }
    });

    // the buttons on the car cards work as add / remove switches
    $list.on('click', '.add-to-shortlist', function () {
        const $button = $(this);
        const car = $button.data('car');
        const $existing = findItem(car);

        if ($existing.length > 0) {
            $existing.remove();
            window.showToast('Removed from your shortlist: ' + car);
        } else {
            addItem(car);
            window.showToast('Added to your shortlist: ' + car);
            // small "pop" of the heart icon, the class is removed when the animation ends
            $button.addClass('is-popping').one('animationend', function () {
                $button.removeClass('is-popping');
            });
        }

        hideError();
        updateShortlist();
    });

    // ===== start =====

    $.each(loadItems(), function (index, text) {
        if (typeof text === 'string' && text.trim() !== '' && findItem(text).length === 0) {
            addItem(text.trim().slice(0, 60));
        }
    });
    updateShortlist();

    // the last search is restored; a brand in the address (from the brand tiles on the home page) wins
    const saved = loadFilters();
    const brandFromLink = new URLSearchParams(window.location.search).get('brand');

    if (typeof saved.query === 'string') {
        $search.val(saved.query.slice(0, 60));
    }
    if ($sort.find('option[value="' + saved.sort + '"]').length) {
        $sort.val(saved.sort);
    }
    if (brandFromLink) {
        setBrand(brandFromLink);
        // the visitor chose a brand, an old search text would only hide its cars
        $search.val('');
    } else if (saved.brand) {
        setBrand(saved.brand);
    }

    sortCars();
    filterCars();

    // "View details" on the home page opens services.html#porsche-911: if the saved filter
    // hides this car, the filter is cleared, so the visitor always sees the car they clicked
    const $targetCard = $cards.filter(function () {
        return '#' + this.id === window.location.hash;
    });
    if ($targetCard.length && $targetCard.css('display') === 'none') {
        $search.val('');
        setBrand('all');
        filterCars();
        $targetCard.get(0).scrollIntoView();
    }

    let savedCurrency = 'USD';
    try {
        savedCurrency = localStorage.getItem(currencyKey) || 'USD';
    } catch (error) {
        // default currency
    }
    if (savedCurrency !== 'USD' && symbols[savedCurrency]) {
        changeCurrency(savedCurrency);
    }
});
