"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const localizer_1 = require("localizer");
const SyncTasks = require("synctasks");
const supportedLocales = {
    'ar-sa': () => require('../translations/ar/LocalizedStrings.json'),
    'bg-bg': () => require('../translations/bg/LocalizedStrings.json'),
    'ca-es': () => require('../translations/ca/LocalizedStrings.json'),
    'cs-cz': () => require('../translations/cs/LocalizedStrings.json'),
    'da-dk': () => require('../translations/da/LocalizedStrings.json'),
    'de-de': () => require('../translations/de/LocalizedStrings.json'),
    'el-gr': () => require('../translations/el/LocalizedStrings.json'),
    'en-gb': () => require('../translations/en-GB/LocalizedStrings.json'),
    'en-us': () => require('../translations/en/LocalizedStrings.json'),
    'es-es': () => require('../translations/es/LocalizedStrings.json'),
    'es-mx': () => require('../translations/es-MX/LocalizedStrings.json'),
    'es-us': () => require('../translations/es-US/LocalizedStrings.json'),
    'et-ee': () => require('../translations/et/LocalizedStrings.json'),
    'fi-fi': () => require('../translations/fi/LocalizedStrings.json'),
    'fr-ca': () => require('../translations/fr-CA/LocalizedStrings.json'),
    'fr-fr': () => require('../translations/fr/LocalizedStrings.json'),
    'he-il': () => require('../translations/he/LocalizedStrings.json'),
    'hi-in': () => require('../translations/hi/LocalizedStrings.json'),
    'hr-hr': () => require('../translations/hr/LocalizedStrings.json'),
    'hu-hu': () => require('../translations/hu/LocalizedStrings.json'),
    'id-id': () => require('../translations/id/LocalizedStrings.json'),
    'it-it': () => require('../translations/it/LocalizedStrings.json'),
    'ja-jp': () => require('../translations/ja/LocalizedStrings.json'),
    'ko-kr': () => require('../translations/ko/LocalizedStrings.json'),
    'lt-lt': () => require('../translations/lt/LocalizedStrings.json'),
    'lv-lv': () => require('../translations/lv/LocalizedStrings.json'),
    'ms-my': () => require('../translations/ms/LocalizedStrings.json'),
    'nb-no': () => require('../translations/nb/LocalizedStrings.json'),
    'nl-nl': () => require('../translations/nl/LocalizedStrings.json'),
    'pl-pl': () => require('../translations/pl/LocalizedStrings.json'),
    'pt-br': () => require('../translations/pt-BR/LocalizedStrings.json'),
    'pt-pt': () => require('../translations/pt/LocalizedStrings.json'),
    'ro-ro': () => require('../translations/ro/LocalizedStrings.json'),
    'ru-ru': () => require('../translations/ru/LocalizedStrings.json'),
    'sk-sk': () => require('../translations/sk/LocalizedStrings.json'),
    'sl-si': () => require('../translations/sl/LocalizedStrings.json'),
    'sr-latn-rs': () => require('../translations/sr-Latn/LocalizedStrings.json'),
    'sv-se': () => require('../translations/sv/LocalizedStrings.json'),
    'th-th': () => require('../translations/th/LocalizedStrings.json'),
    'tr-tr': () => require('../translations/tr/LocalizedStrings.json'),
    'uk-ua': () => require('../translations/uk/LocalizedStrings.json'),
    'vi-vn': () => require('../translations/vi/LocalizedStrings.json'),
    'zh-cn': () => require('../translations/zh-CN/LocalizedStrings.json'),
    'zh-hk': () => require('../translations/zh-HK/LocalizedStrings.json'),
    'zh-tw': () => require('../translations/zh-TW/LocalizedStrings.json')
};
class Localisation extends events_1.EventEmitter {
    constructor(detectionFunction) {
        super();
        this._supportedLanguages = Object.keys(supportedLocales);
        this._getNormalizedLocale = (locale) => {
            const matchedLocale = locale.match('^[a-z]+_[A-Z]+');
            return matchedLocale ? matchedLocale[0].replace('_', '-') : locale;
        };
        this._detectionFunction = detectionFunction;
        this._localizer = new localizer_1.default({
            normalizeLocale: this._getNormalizedLocale,
            getLocaleInfoFromLocale: (locale) => {
                locale = localizer_1.default.fallbackLocale(locale, this._supportedLanguages, Localisation.defaultLocale);
                return SyncTasks.Resolved({
                    newLocale: locale,
                    localizedStringTable: supportedLocales[locale]()
                });
            },
            defaultStringTable: supportedLocales[Localisation.defaultLocale]()
        });
    }
    updateConfig() {
        supportedLocales[Localisation.defaultLocale]();
        this._detectAndSetLocale(undefined);
    }
    getLanguage() {
        return this._language;
    }
    isLanguageRtl(language) {
        language = language.toLowerCase();
        return language === 'ar' || language === 'he' || language === 'iw';
    }
    getLanguageFromLocale(locale) {
        return Localisation.localeLanguageExceptions[locale] || locale.split('-')[0];
    }
    getLanguageCodeInSkypeFormat() {
        const language = this._language.toLowerCase();
        const map = {
            'zh-cn': 'zh-hans',
            'zh-hk': 'zh-hant-hk',
            'zh-tw': 'zh-hant'
        };
        return map[language] || language;
    }
    getLocale() {
        return this._locale;
    }
    setLocale(locale) {
        if (this._locale === locale) {
            return;
        }
        this._detectAndSetLocale(locale);
        this.emit(Localisation.LocaleChangeEvent, this._locale);
    }
    getUnderscoreSeparatedLocale(locale) {
        if (locale) {
            return locale.replace('-', '_');
        }
        return this._locale.replace('-', '_');
    }
    getDetectedSystemLocale() {
        return this._detectedSystemLocale;
    }
    getString(path, paramData = {}) {
        return this._localizer.getString(path, paramData);
    }
    _detectAndSetLocale(override) {
        if (override) {
            this._detectedSystemLocale = this._getNormalizedLocale(override);
        }
        else {
            this._detectedSystemLocale = this._getNormalizedLocale(this._detectionFunction());
        }
        this._setLanguageAndLocale(this._detectedSystemLocale);
    }
    _setLanguageAndLocale(locale) {
        this._localizer.setSystemLocale(locale);
        this._locale = this._localizer.getLocale();
        this._language = this.getLanguageFromLocale(this._locale).toLowerCase();
    }
}
Localisation.LocaleChangeEvent = 'locale-change';
Localisation.defaultLocale = 'en-us';
Localisation.localeLanguageExceptions = {
    'pt-br': 'pt-br',
    'zh-cn': 'zh-cn',
    'zh-hk': 'zh-hk',
    'zh-tw': 'zh-tw',
    'sr-latn-rs': 'sr-latn',
    'en-gb': 'en-gb',
    'es-us': 'es-us',
    'es-ar': 'es-ar',
    'es-mx': 'es-mx',
    'fr-ca': 'fr-ca'
};
exports.Localisation = Localisation;
