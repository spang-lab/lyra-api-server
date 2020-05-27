const { Issuer, generators } = require('openid-client');
const LyraComponent = require('lyra-component');

class Authentication extends LyraComponent {
    getRedirectUrl(clientName) {
        const { clients } = this.config.authentication;
        const client = clients[clientName];
        return client.redirectUrl;
    }

    getLogoutUrl(clientName) {
        const { clients } = this.config.authentication;
        const client = clients[clientName];
        return client.logoutUrl;
    }

    getRequestParams(clientName, verifier) {
        const codeChallenge = generators.codeChallenge(verifier);
        const { scopes } = this.config.authentication;
        const params = {
            scope: scopes.join(' '),
            response_type: 'code',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            redirect_uri: this.getRedirectUrl(clientName),
        };
        return params;
    }


    async getClient() {
        if (this.client) {
            return this.client;
        }
        const config = this.config.authentication;
        const clientSecret = this.config.secrets.oidcClientSecret;
        Issuer.defaultHttpOptions = { timeout: 2500 };
        const discoverUrl = `${config.url}/.well-known/openid-configuration`;
        this.logger.verbose(`OpenId connect to ${discoverUrl}`);
        const issuer = await Issuer.discover(discoverUrl);
        const client = new issuer.Client({
            client_id: config.clientId,
            client_secret: clientSecret,
        });
        client.CLOCK_TOLERANCE = 10;
        this.client = client;
        return client;
    }

    decodeIdToken(token) {
        const base64String = token.split('.')[1];
        const payloadString = Buffer
            .from(base64String, 'base64')
            .toString();
        const payload = JSON.parse(payloadString);
        return payload;
    }

    async login(clientName) {
        const verifier = generators.codeVerifier();
        const params = this.getRequestParams(clientName, verifier);
        const client = await this.getClient();
        const url = client.authorizationUrl(params);
        const session = {
            verifier,
            response_type: params.response_type,
        };
        return {
            url,
            session,
        };
    }

    async callback(clientName, req, session) {
        const client = await this.getClient();
        const redirectUrl = this.getRedirectUrl(clientName);
        const { verifier } = session;
        const params = client.callbackParams(req);
        const tokens = await client.callback(redirectUrl, params, { code_verifier: verifier });
        return tokens;
    }

    async validate(token) {
        const client = await this.getClient();
        const dToken = await client.decryptIdToken(token);
        const vToken = await client.validateIdToken(dToken, null, 'token');
        const payload = this.decodeIdToken(vToken);
        return payload;
    }

    async userinfo(token) {
        const client = await this.getClient();
        const info = await client.userinfo(token);
        return info;
    }

    async logout(clientName, token) {
        const client = await this.getClient();
        const url = client.endSessionUrl({
            post_logout_redirect_uri: this.getLogoutUrl(clientName),
            id_token_hint: token,
        });
        return url;
    }
}

module.exports = Authentication;
