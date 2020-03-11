"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = require("child_process");
const CONTACT_START = 'CONTACT';
const CONTACT_END = 'CONTACT-END';
const PHONES_START = 'PHONES';
const PHONES_END = 'PHONES-END';
const EMAILS_START = 'EMAILS';
const EMAILS_END = 'EMAILS-END';
const apple_script = `
tell application "System Events"
    set isRunning to (name of processes) contains "Contacts"
end tell
set myOutput to ""
tell application "Address Book"
    try
        repeat with p in people
            set myOutput to myOutput & "` + CONTACT_START + `" & "\\n-"

            set myOutput to myOutput & my empty_if_missing(first name of p) & "\\n-" & my empty_if_missing(middle name of p) & "\\n-" & my empty_if_missing(last name of p) & "\\n-"
            set myOutput to myOutput & my empty_if_missing(id of p) & "\\n"
            set myOutput to myOutput & "` + PHONES_START + `" & "\\n"
            repeat with ph in phones of p
                set myOutput to myOutput & "-" & label of ph & "\\n-" & value of ph & "\\n"
            end repeat
            set myOutput to myOutput & "` + PHONES_END + `" & "\\n" & "` + EMAILS_START + `" & "\\n"
            repeat with em in emails of p
                set myOutput to myOutput & "-" & label of em & "\\n-" & value of em & "\\n"
            end repeat
            set myOutput to myOutput & "` + EMAILS_END + `" & "\\n" & "` + CONTACT_END + `" & "\\n"
        end repeat
    on error errStr number errorNumber
        if not isRunning then
            quit
        end if
        error errStr number errorNumber
    end try
    if not isRunning then
        quit
    end if
end tell
return myOutput

on empty_if_missing(inVal)
    set retVal to ""
    if inVal is not missing value then
        set retVal to inVal
    end if
    return retVal
end empty_if_missing
`;
class ContactsExporter {
    _handleOutputStream(stream) {
        stream.body = '';
        stream.setEncoding('utf8');
        stream.on('data', chunk => {
            stream.body += chunk;
        });
    }
    _getValue(line) {
        return line.substr(1);
    }
    _splitLines(lines, start, end) {
        const output = [];
        let current;
        if (lines) {
            lines.forEach(l => {
                if (l === start) {
                    current = [];
                }
                else if (l === end) {
                    if (current) {
                        output.push(current);
                        current = undefined;
                    }
                }
                else if (current) {
                    current.push(l);
                }
            });
        }
        return output;
    }
    _parsePhones(lines) {
        const phones = [];
        let i = 0;
        while (i * 2 + 1 < lines.length) {
            phones.push({
                label: this._getValue(lines[i * 2]),
                number: this._getValue(lines[i * 2 + 1])
            });
            i++;
        }
        return phones;
    }
    _parseEmails(lines) {
        const emails = [];
        let i = 0;
        while (i * 2 + 1 < lines.length) {
            emails.push({
                label: this._getValue(lines[i * 2]),
                email: this._getValue(lines[i * 2 + 1])
            });
            i++;
        }
        return emails;
    }
    _parseContact(lines) {
        let contact = {};
        if (lines[0].length > 1) {
            contact.givenName = this._getValue(lines[0]);
        }
        if (lines[1].length > 1) {
            contact.middleName = this._getValue(lines[1]);
        }
        if (lines[2].length > 1) {
            contact.familyName = this._getValue(lines[2]);
        }
        if (lines[3].length > 1) {
            contact.recordId = this._getValue(lines[3]);
        }
        lines.splice(0, 4);
        contact.phoneNumbers = this._parsePhones(this._splitLines(lines, PHONES_START, PHONES_END)[0]);
        contact.emailAddresses = this._parseEmails(this._splitLines(lines, EMAILS_START, EMAILS_END)[0]);
        return contact;
    }
    _parseOutput(data) {
        const contacts = [];
        const contactLines = this._splitLines(data.match(/[^\r\n]+/g), CONTACT_START, CONTACT_END);
        contactLines.forEach(lines => {
            contacts.push(this._parseContact(lines));
        });
        return contacts;
    }
    _getMacContacts() {
        if (this._returnPromise) {
            return this._returnPromise;
        }
        this._returnPromise = new Promise((resolve, reject) => {
            const scriptProcess = childProcess.spawn('osascript', ['-e', apple_script]);
            this._handleOutputStream(scriptProcess.stdout);
            this._handleOutputStream(scriptProcess.stderr);
            scriptProcess.on('exit', code => {
                delete this._returnPromise;
                if (code) {
                    reject(new Error(`Failed contacts export with error: ${scriptProcess.stderr.body}`));
                }
                else {
                    try {
                        resolve(this._parseOutput(scriptProcess.stdout.body));
                    }
                    catch (e) {
                        reject(e);
                    }
                }
            });
        });
        return this._returnPromise;
    }
    getDeviceContacts() {
        if (process.platform === 'darwin') {
            return this._getMacContacts();
        }
        return Promise.resolve([]);
    }
}
exports.contactsExporter = new ContactsExporter();
