"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xmldom_1 = require("xmldom");
const Logger_1 = require("../../logger/Logger");
function formatTimestamp(timestamp) {
    if (isNaN(timestamp)) {
        return '';
    }
    const dt = new Date(timestamp * 1000);
    const timeString = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
    return timeString;
}
exports.formatTimestamp = formatTimestamp;
function sanitizeXml(xmlVal, id) {
    let result = '';
    if (xmlVal) {
        const decodedVal = preprocessXmlString(xmlVal);
        result = translateXml(decodedVal, id);
    }
    return result;
}
exports.sanitizeXml = sanitizeXml;
function preprocessXmlString(bodyXml) {
    return bodyXml.replace(/&nbsp;/g, ' ')
        .replace(/&mdash;/g, '--')
        .replace(/&ndash;/g, '-')
        .replace(/&(?!quot|amp|apos|lt|gt)\w+;/g, '')
        .replace(/<(?!\w+|\/)/g, '&lt;')
        .replace(/([^\w"'\/])\B>/g, (match, p1, offset, str) => {
        for (let i = offset - 1; i >= 0; i--) {
            if (str[i] === '>') {
                break;
            }
            if (str[i] === '<') {
                return p1 + '>';
            }
        }
        return (p1 === '>') ? '&gt;&gt;' : p1 + '&gt;';
    })
        .replace(/[\r\n]*[\r\n]/g, '<br />');
}
function translateXml(body, messageId) {
    let parser = new xmldom_1.DOMParser({
        locator: {},
        errorHandler: {
            warning: w => Logger_1.getInstance().debug(`[MsgBodytransform] Warning: ${w}`),
            error: w => Logger_1.getInstance().debug(`[MsgBodytransform] Error: ${w} messageId: ${messageId} body: ${body}`),
            fatalError: w => Logger_1.getInstance().error(`[MsgBodytransform] Fatal error: ${w}`)
        }
    });
    let doc = parser.parseFromString(`<x>${body}</x>`, 'application/xml');
    if (!doc || !doc.firstChild) {
        return '';
    }
    let result = processNodes(doc.firstChild.childNodes);
    return result;
}
function processNodes(nodes) {
    let result = '';
    let len = nodes.length;
    for (let i = 0; i < len; i++) {
        result += translateNode(nodes[i]);
    }
    return result;
}
function translateNode(e) {
    let result = '';
    if (e.nodeType === 3) {
        result += e.nodeValue !== null ? e.nodeValue.replace(/\</g, '&lt;')
            .replace(/\>/g, '&gt;') : '';
    }
    else if (e.nodeType === 1) {
        result += translateElement(e);
    }
    return result;
}
const TRANSLATION_TABLE = {
    'a': translateLink,
    'at': (e) => copyNodeToSpan(e, 'at'),
    'b': copyNode,
    'blink': copyNode,
    'br': copyNode,
    'c': translateContact,
    'contacts': translateContacts,
    'em': copyNode,
    'flag': translateFlag,
    'files': translateFiles,
    'file': translateFile,
    'font': copyNode,
    'i': copyNode,
    'location': translateLocation,
    'pre': copyNode,
    'p': copyNode,
    'quote': translateQuote,
    'SwiftCard': copyNode,
    's': (e) => copyNodeToDiv(e, null),
    'sms': translateSms,
    'ss': translateSs,
    'strong': copyNode,
    'systemMessage': (e) => copyNodeToDiv(e, 'systemMessage'),
    'target': translateTarget,
    'targets': translateTargets,
    'ul': (e) => copyNodeToDiv(e, null),
    'URIObject': (e) => copyNodeToDiv(e, 'uri-object'),
    'voicemail': translateVoicemail
};
function translateVoicemail(e) {
    let alt = getAttribute(e, 'alt');
    let text = alt || 'Voicemail message';
    return `<div>${text}</div>`;
}
function translateElement(e) {
    let result = '';
    let translator = TRANSLATION_TABLE[e.nodeName];
    if (translator) {
        result += translator(e);
    }
    return result;
}
function translateSs(e) {
    let type = e.attributes.getNamedItem('type').value;
    let text = e.innerHTML;
    return `<img src="https://static-asm.secure.skypeassets.com/pes/v1/emoticons/${type}/views/default_20" alt="${text}" >`;
}
function translateQuote(e) {
    let author = getAttribute(e, 'authorname');
    let timestamp = getAttribute(e, 'timestamp');
    let timeString = formatTimestamp(Number(timestamp));
    let text = processNodes(e.childNodes);
    return `<div class="quote">${text}<div><span class="author">${author}</span><span class="timestamp">${timeString}</span></div></div>`;
}
function translateLink(e) {
    let href = getAttribute(e, 'href');
    let result = `<a href="${href}" target="blank">`;
    result += processNodes(e.childNodes);
    result += '</a>';
    return result;
}
function translateSms(e) {
    const alt = getAttribute(e, 'alt');
    let targets = processNodes(e.childNodes);
    return `<div class="sms">${alt}${targets}</div>`;
}
function translateTargets(e) {
    let childText = processNodes(e.childNodes);
    return (childText) ? `<div class="sms-targets">${childText}</div>` : '';
}
function translateTarget(e) {
    return `<div class="sms-target">${e.nodeValue}<div>`;
}
function translateFiles(e) {
    let result = '<div class="files">File transfer:';
    result += processNodes(e.childNodes);
    result += '</div>';
    return result;
}
function translateFlag(e) {
    return copyNodeToSpan(e, 'flag');
}
function translateFile(e) {
    let status = getAttribute(e, 'status');
    let result = '<div class="file">';
    if (status) {
        result += '<span>Status: ${status}</span>';
    }
    result += processNodes(e.childNodes);
    result += '</div>';
    return result;
}
function translateContacts(e) {
    let result = '<div class="contacts">';
    result += processNodes(e.childNodes);
    result += '</div>';
    return result;
}
function translateContact(e) {
    let result = '<div class="contact">';
    const skypeName = getAttribute(e, 's');
    const fullName = getAttribute(e, 'f');
    if (fullName) {
        result += `<span>${fullName}</span>`;
    }
    if (skypeName) {
        result += `<span>(${skypeName})</span>`;
    }
    result += '</div>';
    return result;
}
function translateLocation(e) {
    let result = '<div class="location">';
    let address = getAttribute(e, 'address');
    let latitude = getAttribute(e, 'latitude');
    let longitude = getAttribute(e, 'longitude');
    result += `<div>address: ${address}</div>`;
    result += `<div>latitude: ${latitude}</div>`;
    result += `<div>longitude: ${longitude}</div>`;
    result += processNodes(e.childNodes);
    result += '</div>';
    return result;
}
function getAttribute(e, atribute) {
    let result = '';
    if (e && e.attributes && e.attributes.getNamedItem(atribute)) {
        result = e.attributes.getNamedItem(atribute).value;
    }
    return result;
}
function copyNode(e) {
    let result = '';
    result += serializeNode(e);
    result += processNodes(e.childNodes);
    result += serializeNodeEnd(e);
    return result;
}
function copyNodeToDiv(e, cls) {
    let result = (!!cls) ? `<div class=${cls}>` : '<div>';
    result += processNodes(e.childNodes);
    result += '</div>';
    return result;
}
function copyNodeToSpan(e, cls) {
    let result = (!!cls) ? `<span class=${cls}>` : '<span>';
    result += processNodes(e.childNodes);
    result += '</span>';
    return result;
}
function serializeNode(e) {
    let attributes = '';
    const attrSize = e.attributes.length;
    for (let i = 0; i < attrSize; i++) {
        let a = e.attributes.item(i);
        attributes += `${a.name}="${a.value}" `;
    }
    return `<${e.nodeName} ${attributes}>`;
}
function serializeNodeEnd(e) {
    return `</${e.nodeName}>`;
}
