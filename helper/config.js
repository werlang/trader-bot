const fs = require('fs');

// config('filename'): load file and return it
// config(): return file previously loaded
// config(true): reload same file and return it
const config = {
    load: function(filename) {
        if (!filename) {
            return this.file || false;
        }
        if (filename !== true) {
            this.filename = filename;
        }

        if (!fs.existsSync(this.filename)) {
            return false;
        }
    
        const file = fs.readFileSync(this.filename);
        try {
            this.file = JSON.parse(file);
            return this.file;
        }
        catch(error) {
            console.log(error);
            return false;
        }    
    },
}

module.exports = filename => {
    return config.load(filename);
};