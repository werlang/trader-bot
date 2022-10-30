const config = require('../config.json');

module.exports = {
    url: `https://api.telegram.org`,

    alert: async function(message, opt={}){
        if (!config.telegram.enabled){
            return false;
        }

        const args = {
            chat_id: opt.chatId || config.telegram.chatId,
            text: message,
        }

        let token = opt.token || config.telegram.token;

        // if send object, convert it to multiline text
        if (typeof args.text !== 'string'){
            args.text = Object.entries(args.text).map(([k,v]) => `${k}: *${v}*`);
            opt.markdown = true;
        }

        // allow multiline message to be sent as an array
        if (Array.isArray(args.text) && opt.multiLine !== false) {
            args.text = args.text.join('\r\n');
        }

        if (opt.markdown) {
            // formatting
            // https://core.telegram.org/bots/api#formatting-options
            args.parse_mode = 'MarkdownV2';
            // telegram MD2 does not accept . character
            args.text = args.text.replace(/\./g, "\\.");
        }
        
        let url = `${this.url}/bot${token}/sendMessage`;

        url = `${url}?${ new URLSearchParams(args).toString() }`;
        return await (await fetch(url)).json();
    },
}
