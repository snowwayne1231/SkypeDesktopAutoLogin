class ExporterUi {
    constructor(exporter, localisation, domLocaliser, logger) {
        this.progressBackground = '#EFEFEF';
        this.progressColor = '#00AFF0';
        this.spinnerSize = 220;
        this.exporter = exporter;
        this.localisation = localisation;
        this.domLocaliser = domLocaliser;
        this.logger = logger;
        this._registerReadyEvent();
    }
    init() {
        this.exporter.fetchDefaultDbAccounts().then(accounts => {
            this.foundAccounts = this._filterUserAccounts(accounts, this.exporter.username);
            this._fillInitialScreen(this.foundAccounts);
        }).catch(this._handleError);
    }
    _registerReadyEvent() {
        document.addEventListener('DOMContentLoaded', () => {
            this.domLocaliser.translateDomElement(document.body);
            document.documentElement.lang = this.localisation.getLanguage();
            document.documentElement.dir = this.localisation.isLanguageRtl(this.localisation.getLanguage()) ? 'rtl' : 'ltr';
            document.getElementById('close-no-acc').addEventListener('click', () => { window.close(); });
            document.getElementById('close-error').addEventListener('click', () => { window.close(); });
        });
    }
    _fillInitialScreen(profiles) {
        if (!profiles || !profiles.length) {
            this.logger.info('[ExporterDialog] No local profiles found');
            this._activateScreen('no-profiles');
            return;
        }
        for (let profile of profiles) {
            let username = `${profile.fullName} (${profile.skypeName})`;
            let dbPath = profile.dbPath;
            this._displayFoundProfile(username, dbPath);
        }
        this.logger.info(`[ExporterDialog] Found ${profiles.length} local profile(s)`);
        document.querySelector('.open-file').textContent = this.exporter.getOutputFolder();
        this._activateScreen('profiles');
        document.querySelector('.open-file').addEventListener('click', event => {
            event.preventDefault();
            this.exporter.openOutputFolder();
        });
        document.querySelector('.open-in-browser').addEventListener('click', () => { this.exporter.openInBrowser(); });
        document.querySelector('.next').addEventListener('click', event => {
            event.preventDefault();
            let accountsToExport = this._getListOfCheckedAccounts();
            if (!accountsToExport.length) {
                return;
            }
            this.logger.info(`[ExporterDialog] Starting with export of ${accountsToExport.length} profile(s)`);
            this._showProgressScreen();
            this.exporter.exportAccounts(accountsToExport, percent => {
                this._updateProgressBar(percent);
            }).then(() => {
                this.logger.info('[ExporterDialog] Export successfully finished');
                this._showFinalScreen();
            }).catch(this._handleError);
        });
    }
    _handleError(error) {
        let errorDetails = error.message ? error.message : JSON.stringify(error);
        this.logger.error(`[ExporterDialog] Export failed: ${errorDetails}`);
        document.getElementById('error-details').innerText = errorDetails;
        this._activateScreen('error');
    }
    _getListOfCheckedAccounts() {
        let checkedProfiles = Array.from(document.querySelectorAll('.account.is-checked .path')).map(path => path.textContent);
        let accountsToExport = [];
        this.foundAccounts.forEach(account => {
            if (account.dbPath && checkedProfiles.indexOf(account.dbPath) > -1) {
                accountsToExport.push(account);
            }
        });
        return accountsToExport;
    }
    _activateScreen(name) {
        let active = document.querySelector('.is-active');
        if (active) {
            active.classList.remove('is-active');
        }
        document.querySelector(`.screen[data-screen="${name}"]`).classList.add('is-active');
    }
    _showProgressScreen() {
        this._activateScreen('progress');
        const canvas = document.querySelector('.progressbar canvas');
        canvas.width = canvas.height = this.spinnerSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (window.devicePixelRatio > 1) {
                let scaleRatio = window.devicePixelRatio;
                canvas.style.width = canvas.style.height = this.spinnerSize + 'px';
                canvas.width = canvas.height = this.spinnerSize * scaleRatio;
                ctx.scale(scaleRatio, scaleRatio);
            }
            ctx.translate(this.spinnerSize / 2, this.spinnerSize / 2);
            ctx.rotate((-1 / 2 + 0 / 180) * Math.PI);
        }
        this._updateProgressBar(0);
    }
    _updateProgressBar(percentage) {
        const span = document.querySelector('.progressbar span');
        span.textContent = percentage + '%';
        this._drawCircle(this.progressBackground, 1);
        if (percentage > 0) {
            this._drawCircle(this.progressColor, percentage / 100);
        }
    }
    _drawCircle(color, percent) {
        const canvas = document.querySelector('.progressbar canvas');
        const progressThickness = 15;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            percent = Math.min(Math.max(0, percent || 1), 1);
            const radius = (this.spinnerSize - progressThickness) / 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2 * percent, false);
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.lineWidth = progressThickness;
            ctx.stroke();
        }
    }
    _showFinalScreen() {
        let header = document.querySelector('.screen[data-screen="progress"] h2');
        header.textContent = this.localisation.getString('ExporterDialog.FinalScreenHeader');
        document.querySelector('.file-finder').classList.add('is-active');
    }
    _displayFoundProfile(username, filePath) {
        const template = document.querySelector('template').content;
        const profile = document.importNode(template, true);
        profile.querySelector('.username').textContent = username;
        profile.querySelector('.path').textContent = filePath;
        profile.querySelector('input').addEventListener('click', event => {
            const target = event.target;
            target.closest('.account').classList.toggle('is-checked');
        });
        document.querySelector('.accounts').appendChild(profile);
    }
    _filterUserAccounts(accounts, username) {
        let accountsToExpose = [];
        accounts.forEach(account => {
            if (account.skypeName && account.skypeName === username) {
                accountsToExpose.push(account);
            }
        });
        return accountsToExpose;
    }
}
const exporter = new ExporterUi(window.exporterApi, window['localisation'], window['domLocaliser'], window['logger']);
exporter.init();
