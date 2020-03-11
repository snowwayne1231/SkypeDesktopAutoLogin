"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SyncTasks = require("synctasks");
const AuthSession = require("./AuthSession");
const HttpsRequest_1 = require("../HttpsRequest");
const Logger_1 = require("../logger/Logger");
const WebAuthenticationBroker_1 = require("./WebAuthenticationBroker");
const GoogleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const GoogleCallbackUrl = 'https://accounts.google.com/o/oauth2/approval';
const GoogleAuthTokenUrl = 'https://www.googleapis.com/oauth2/v4/token';
const GoogleAuthHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};
const sessionName = 'google_auth_session';
class GoogleAuthProvider {
    constructor() {
        this._getGoogleRequestUrl = (googleRedirectUri, googleClientId, scope) => {
            const urlParams = {
                response_type: 'code',
                redirect_uri: googleRedirectUri,
                client_id: googleClientId,
                scope: scope.join(' '),
            };
            const googleRequestUrl = `${GoogleAuthUrl}?client_id=${encodeURIComponent(urlParams.client_id)}` +
                `&redirect_uri=${encodeURIComponent(urlParams.redirect_uri)}` +
                `&response_type=${urlParams.response_type}&scope=${encodeURIComponent(urlParams.scope)}`;
            return googleRequestUrl;
        };
    }
    getAuthenticationToken(clientId, scope, redirectUri, windowOptions) {
        return this.getAuthorizationCode(clientId, scope, redirectUri, windowOptions)
            .then(authorizationCode => this._getAuthTokenFromCodeAsync(clientId, redirectUri, authorizationCode));
    }
    getAuthorizationCode(clientId, scope, redirectUri, windowOptions) {
        const googleRequestUrl = this._getGoogleRequestUrl(redirectUri, clientId, scope);
        const session = AuthSession.createSession(sessionName);
        return WebAuthenticationBroker_1.default.authenticateAsync(googleRequestUrl, GoogleCallbackUrl, session, windowOptions)
            .then(authResponse => {
            if (authResponse.status !== WebAuthenticationBroker_1.AuthenticationStatus.Success) {
                return SyncTasks.Rejected(WebAuthenticationBroker_1.AuthenticationStatus[authResponse.status]);
            }
            else {
                const authorizationCode = this._getAuthorizationCode(authResponse.data);
                const errorCode = this._getErrorCode(authResponse.data);
                if (authorizationCode) {
                    return authorizationCode;
                }
                else if (errorCode) {
                    return SyncTasks.Rejected(WebAuthenticationBroker_1.AuthenticationStatus[WebAuthenticationBroker_1.AuthenticationStatus.PermissionsDenied]);
                }
                else {
                    return SyncTasks.Rejected(WebAuthenticationBroker_1.AuthenticationStatus[WebAuthenticationBroker_1.AuthenticationStatus.UnexpectedResponse]);
                }
            }
        })
            .finally(() => AuthSession.clearSession(sessionName))
            .toEs6Promise();
    }
    _getAuthorizationCode(responseData) {
        const raw_code = /code=([^&]*)/.exec(responseData);
        return (raw_code && raw_code.length > 1) ? raw_code[1] : undefined;
    }
    _getErrorCode(responseData) {
        const error = /error=([^&]*)/.exec(responseData);
        return (error && error.length > 1) ? error[1] : undefined;
    }
    _getAuthTokenFromCodeAsync(clientId, redirectUri, authorizationCode) {
        return new Promise((resolve, reject) => {
            const logger = Logger_1.getInstance();
            const postObj = {
                'code': authorizationCode,
                'client_id': clientId,
                'grant_type': 'authorization_code',
                'redirect_uri': redirectUri
            };
            const googleAuthTokenRequest = new HttpsRequest_1.HttpsRequest({
                method: 'POST',
                url: GoogleAuthTokenUrl,
                headers: GoogleAuthHeaders,
                body: JSON.stringify(postObj)
            }, logger);
            googleAuthTokenRequest.send()
                .then(res => {
                if (res.statusCode === 200) {
                    const googleToken = JSON.parse(res.body);
                    resolve(this._extractAuthToken(googleToken));
                }
                else {
                    reject(WebAuthenticationBroker_1.AuthenticationStatus[WebAuthenticationBroker_1.AuthenticationStatus.HttpError]);
                }
            })
                .catch((err) => {
                reject(WebAuthenticationBroker_1.AuthenticationStatus[WebAuthenticationBroker_1.AuthenticationStatus.HttpError]);
            });
        });
    }
    _extractAuthToken(googleToken) {
        const authToken = {
            accessToken: googleToken.access_token,
            scope: googleToken.scope,
            expiresIn: googleToken.expires_in,
            refreshToken: googleToken.refresh_token,
            tokenType: googleToken.token_type,
            tokenId: googleToken.id_token
        };
        return authToken;
    }
}
exports.GoogleAuthProvider = GoogleAuthProvider;
