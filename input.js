import Picker from './picker';
import Localisation from './localisations';
import DateFormat from './dateformat';

export default class Input {
    constructor(input) {
        this.element = input;
        this.element.setAttribute('data-has-picker', '');

        this.locale = this.element.getAttribute('lang')
            || document.body.getAttribute('lang')
            || 'en';

        this.firstDayOfWeek = this.element.getAttribute('data-first-day')
            || document.body.getAttribute('data-first-day')
            || 'su';

        this.format = this.element.getAttribute('date-format')
            || document.body.getAttribute('date-format')
            || this.element.getAttribute('data-date-format')
            || document.body.getAttribute('data-date-format')
            || 'yyyy-mm-dd';

        this.dateRange = this.getDateRange();

        this.localeLabels = this.getLocaleLabels();

        Object.defineProperties(
            this.element,
            {
                valueAsDate: {
                    get: () => {
                        if (!this.element.value) {
                            return null;
                        }
                        const format = this.format || 'yyyy-mm-dd';
                        const parts = this.element.value.match(/(\d+)/g);
                        let i = 0;
                        const fmt = {};

                        format.replace(/(yyyy|dd|mm)/g, (part) => {
                            fmt[part] = i;
                            i += 1;
                        });

                        return new Date(parts[fmt.yyyy], parts[fmt.mm] - 1, parts[fmt.dd]);
                    },
                    set: (val) => {
                        this.element.value = DateFormat(val, this.format);
                        // trigger change event to execute event listeners on the date element
                        this.element.dispatchEvent(new Event('change', { bubbles: true }));
                    },
                },
                valueAsNumber: {
                    get: () => {
                        if (!this.element.value) {
                            return NaN;
                        }

                        return this.element.valueAsDate.valueOf();
                    },
                    set: (val) => {
                        this.element.valueAsDate = new Date(val);
                    },
                },
            },
        );

        // watch for element attribute changes
        if ("MutationObserver" in window) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName.indexOf('min') !== -1 || mutation.attributeName.indexOf('max') !== -1) {
                        this.dateRange = this.getDateRange();
                    } else if (mutation.attributeName === 'lang') {
                        this.locale = this.element.getAttribute(mutation.attributeName);
                        this.localeLabels = this.getLocaleLabels();
                    } else if (mutation.attributeName === 'data-first-day') {
                        this.firstDayOfWeek = this.element.getAttribute(mutation.attributeName);
                    } else if (mutation.attributeName === 'data-date-format' || mutation.attributeName === 'date-format') {
                        const date = this.element.valueAsDate;
                        this.format = this.element.getAttribute(mutation.attributeName);
                        if (date) {
                            this.element.valueAsDate = date; // reset date to update the format
                        }
                    }
                });
            });

            mutationObserver.observe(this.element, {
                attributes: true,
            });
        }

        // Open the picker when the input get focus,
        // also on various click events to capture it in all corner cases.
        const showPicker = () => {
            const elm = this.element;
            elm.firstDayOfWeek = this.firstDayOfWeek;
            elm.locale = this.localeLabels;
            elm.dateRange = this.dateRange;
            // const didAttach = Picker.attachTo(elm); <-for checking purposes
            Picker.attachTo(elm);
        };

        this.element.addEventListener('focus', showPicker);
        this.element.addEventListener('mouseup', showPicker);

        const minDate = this.dateRange[0];
        const maxDate = this.dateRange[1];

        // Update the picker if the date changed manually in the input.
        this.element.addEventListener('keydown', (e) => {
            let date = new Date();

            switch (e.keyCode) {
                case 9: // hide on tab
                case 27:
                    // hide on esc
                    Picker.hide();
                    break;
                case 37:
                    // arrow left
                    if (this.element.valueAsDate) {
                        date = Picker.returnCurrentDate();
                        date.setDate(date.getDate() - 1);

                        if (date >= minDate) {
                            this.element.valueAsDate = date;
                        }
                    }
                    break;
                case 38:
                    // arrow up
                    if (this.element.valueAsDate) {
                        date = Picker.returnCurrentDate();
                        date.setDate(date.getDate() - 7);

                        if (date >= minDate) {
                            this.element.valueAsDate = date;
                        }
                    }
                    break;
                case 39:
                    // arrow right
                    if (this.element.valueAsDate) {
                        date = Picker.returnCurrentDate();
                        date.setDate(date.getDate() + 1);

                        if (date <= maxDate) {
                            this.element.valueAsDate = date;
                        }
                    }
                    break;
                case 40:
                    // arrow down
                    if (this.element.valueAsDate) {
                        date = Picker.returnCurrentDate();
                        date.setDate(date.getDate() + 7);

                        if (date <= maxDate) {
                            this.element.valueAsDate = date;
                        }
                    }
                    break;
                default:
                    break;
            }

            // remove to improve performance
            Picker.syncPickerWithInput();
        });

        this.element.addEventListener('keyup', () => {
            Picker.syncPickerWithInput();
        });
    }

    getLocaleLabels() {
        const locale = this.locale.toLowerCase();
        let localeLabels;

        Object.keys(Localisation).forEach((key) => {
            const localeSet = key;
            let localeList = localeSet.split('_');
            localeList = localeList.map((el) => el.toLowerCase());

            if (localeList.indexOf(locale) >= 0 || localeList.indexOf(locale.substr(0, 2)) >= 0) {
                localeLabels = Localisation[localeSet];
            }
        });
        return localeLabels;
    }

    // determines if min and max values are given
    getDateRange() {
        const minDateMark = new Date("1800");
        const maxDateMark = new Date("2200");

        const dateRange = [];

        let minDate;
        let maxDate;

        const minAttribute = this.element.getAttribute('min')
            || this.element.getAttribute('data-min');
        // If attribute exisits
        if (minAttribute) {
            const givenDate = new Date(minAttribute);
            givenDate.setHours(0, 0, 0, 0);
            if (givenDate >= minDateMark && givenDate < maxDateMark) {
                minDate = givenDate;
            }
        }

        const maxAttribute = this.element.getAttribute('max')
            || this.element.getAttribute('data-max');
        // If attribute exisits
        if (maxAttribute) {
            const givenDate = new Date(maxAttribute);
            givenDate.setHours(0, 0, 0, 0);
            if (givenDate > minDateMark && givenDate <= maxDateMark) {
                maxDate = givenDate;
            }
        }
        // Check if minDate is set
        if (!minDate) {
            minDate = minDateMark;
        }
        // Check if maxDate is set
        if (!maxDate) {
            maxDate = maxDateMark;
        }
        // Check if there are in correct order
        if (minDate < maxDate) {
            dateRange.push(minDate, maxDate);
        } else {
            dateRange.push(minDateMark, maxDateMark);
        }

        return dateRange;
    }

    // Return false if the browser does not support input[type="date"].
    static supportsDateInput() {
        const input = document.createElement('input');
        input.setAttribute('type', 'date');

        const notADateValue = 'not-a-date';
        input.setAttribute('value', notADateValue);

        return !(input.value === notADateValue);
    }

    // Will add the Picker to all inputs in the page.
    static addPickerToDateInputs() {
        // Get and loop all input[type="date"]s that do not have '[data-has-picker]' yet.
        const dateInputs = document.querySelectorAll('input[type="date"]:not([data-has-picker])');
        const { length } = dateInputs;

        if (!length) {
            return false;
        }

        for (let i = 0; i < length; i += 1) {
            new Input(dateInputs[i]);
        }

        return true;
    }

    static addPickerToOtherInputs() {
        // Get and loop all the input[type="text"]s with
        // class date-polyfill that do not have '[data-has-picker]' yet.
        const dateInputs = document.querySelectorAll('input[type="text"].date-polyfill:not([data-has-picker])');
        const { length } = dateInputs;

        if (!length) {
            return false;
        }

        for (let i = 0; i < length; i += 1) {
            new Input(dateInputs[i]);
        }

        return true;
    }
}
