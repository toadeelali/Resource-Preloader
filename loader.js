function Preloader(manifest, callback) {
    this.version = "1.0.2";
    this.supportedImages = ["jpg", "png", "svg", "gif"];
    this.supportedScripts = ["js"];
    this.supportedSheets = ["css"];
    this.supportedSounds = ["mp3", "ogg", "wav"];
    this.supportedDataStrings = ["json"];
    this.supportedFonts = ["ttf", "otf", "woff", "woff2"];

    this.SUPPORTED_TYPES = {
        image: "image",
        sound: "sound",
        script: "script",
        style: "style",
        json: "json",
        font: "font"
    }

    this.STATUS = {
        notStarted: "notStarted",
        loading: "loading",
        loaded: "loaded",
        error: "error"
    }

    this.rail = [];

    this.callback = callback;
    this.concurrent = 10;

    this.isTaskComplete = false;
    this.total = manifest.length;
    this.loaded = 0;
    this.howlerFound = false;
    this.manifest = JSON.parse(JSON.stringify(manifest));

    // prep all 
    for (var i = 0; i < this.manifest.length; i++) {
        if (this.manifest[i].src === "libs/howler.min.js") {
            this.howlerFound = true;
            this.manifest[i].id = "howler";
        }

        this.manifest[i].status = this.STATUS.notStarted;
        this.manifest[i].type = this.loadTypeTagger(this.getFileType(this.manifest[i].src));

        if (this.manifest[i].type === this.SUPPORTED_TYPES.sound) {
            this.manifest[i].dependency = ["howler"];
        }
    }

    if (!this.howlerFound)
        console.warn("Howler required to load sounds. Required path is 'libs/howler.min.js'");
    this.currentNumberOfDownload = 0;
}

Preloader.prototype.Load = function () {
    // copy concurrent numbers from  
    this.getConcurrentFiles();
    var fileIndex = -1;
    if (this.rail.length > 0) {

        for (var i = 0; i < this.rail.length; i++) {
            if (this.rail[i].status === this.STATUS.notStarted) {
                this.rail[i].status = this.STATUS.loading;

                fileIndex = this.getIndexFromManifest(this.rail[i].src, "src");
                this.manifest[fileIndex] = this.rail[i];

                this.currentNumberOfDownload++;
                var that = this;
                new ResourceLoader(this.rail[i], function (e) {
                    that.fileLoaded(e);
                });
            }
        }
    }
    else {
        setTimeout(function (that) {
            that.LoadingComplete();
        }, 1000, this);
    }
}

Preloader.prototype.getConcurrentFiles = function () {
    for (var i = 0; i < this.manifest.length; i++) {
        if (this.manifest[i].status === this.STATUS.notStarted) {
            if (!(this.rail.length >= this.concurrent) && this.isDependencyDownloaded(this.manifest[i])) {
                this.rail.push(this.manifest[i]);
            }
        }
    }
}

Preloader.prototype.fileLoaded = function (e) {
    var i = this.getIndexFromManifest(e.src, "src");
    if (e.isSuccess) {
        this.manifest[i] = e;
        this.manifest[i].status = this.STATUS.loaded;
        this.loaded++;
        this.callback("progress", this.loaded, this.total, e);
    }
    else {
        console.warn("File not found ->", e.src);
        this.manifest[i].status = this.STATUS.error;
    }

    for (i = 0; i < this.rail.length; i++) {
        if (this.rail[i].src === e.src) {
            this.rail.splice(i, 1);
            break;
        }
    }
    // console.log([...this.rail], e.src, this.currentNumberOfDownload);
    this.LoadingComplete(e);
}

Preloader.prototype.LoadingComplete = function () {
    if (this.isTaskComplete) return;
    if (this.loaded !== this.total) {
        this.Load();
    }
    else {
        this.isTaskComplete = true;
        this.callback("complete", this.loaded, this.total, this.DataFormatting(this.manifest));
    }
}

Preloader.prototype.DataFormatting = function () {
    var sounds = {}, images = {};
    for (var i = 0; i < this.manifest.length; i++) {
        if (this.manifest[i].type === this.SUPPORTED_TYPES.sound) {
            sounds[this.manifest[i].id] = this.manifest[i].file;
        }
        else if (this.manifest[i].type === this.SUPPORTED_TYPES.image) {
            images[this.manifest[i].id] = this.manifest[i].file;
        }
    }

    return {
        sounds: sounds,
        images: images,
    }
}

Preloader.prototype.getFileType = function (p) {
    var re = /(?:\.([^.]+))?$/;
    return re.exec(p)[1];
}

Preloader.prototype.loadTypeTagger = function (ext) {
    if (this.supportedImages.indexOf(ext) > -1) {
        return this.SUPPORTED_TYPES.image;
    }
    else if (this.supportedScripts.indexOf(ext) > -1) {
        return this.SUPPORTED_TYPES.script;
    }
    else if (this.supportedSheets.indexOf(ext) > -1) {
        return this.SUPPORTED_TYPES.style;
    }
    else if (this.supportedSounds.indexOf(ext) > -1) {
        return this.SUPPORTED_TYPES.sound;
    }
    else if (this.supportedDataStrings.indexOf(ext) > -1) {
        return this.SUPPORTED_TYPES.json;
    }
    else if (this.supportedFonts.indexOf(ext) > -1) {
        return this.SUPPORTED_TYPES.font;
    }
}

Preloader.prototype.getIndexFromManifest = function (toComp, t) {
    for (var i = 0; i < this.manifest.length; i++) {
        if (this.manifest[i][t] === toComp)
            return i;
    }
}

Preloader.prototype.isDependencyDownloaded = function (item) {
    if (!!!item.dependency) return true;
    var index = -1;
    for (var i = 0; i < item.dependency.length; i++) {
        index = -1;
        index = this.getIndexFromManifest(item.dependency[i], "id");


        if (!this.manifest[index]) {
            console.log(this.manifest[index]);
        }

        if (!this.manifest[index].isSuccess)
            return false;
    }

    return true;
}

/**********************************/
/**********************************/
function ResourceLoader(file, callback) {
    this.SUPPORTED_TYPES = {
        image: "image",
        sound: "sound",
        script: "script",
        style: "style",
        json: "json",
        font: "font"
    }

    this.callback = callback;

    this.result = JSON.parse(JSON.stringify(file));

    this.result.file = null;
    this.result.isSuccess = false;
    switch (this.result.type) {
        case this.SUPPORTED_TYPES.image:
            this.image(this.result.src);
            break;
        case this.SUPPORTED_TYPES.script:
            this.script(this.result.src);
            break;
        case this.SUPPORTED_TYPES.style:
            this.style(this.result.src);
            break;
        case this.SUPPORTED_TYPES.sound:
            this.sound(this.result.src);
            break;
        case this.SUPPORTED_TYPES.json:
            this.json(this.result.src);
            break;
        case this.SUPPORTED_TYPES.font:
            this.font(this.result.src);
            break;
    }
}

ResourceLoader.prototype.image = function (src) {
    var that = this;
    function load() {
        var image = new Image();
        image.onload = function (e) {
            that.result.file = image;
            that.result.isSuccess = true;
            that.callback(that.result);
        };
        image.onerror = function () {
            that.callback(that.result);
        }
        image.src = src;
    }

    load();
}

ResourceLoader.prototype.script = function (src) {
    var that = this;
    function load() {
        var script = document.createElement('script');
        script.setAttribute("type", "text/javascript")
        script.src = src; // no such script

        script.onload = function (e) {
            that.result.isSuccess = true;
            that.callback(that.result);
        };

        script.onerror = function () {
            that.callback(that.result);
        }

        document.body.append(script);
    }

    load();
}

ResourceLoader.prototype.style = function (src) {
    var that = this;
    function load() {
        var sheet = document.createElement('link');
        sheet.setAttribute("rel", "stylesheet");
        sheet.setAttribute("type", "text/css");
        sheet.href = src; // no such script
        sheet.onload = function (e) {
            that.result.isSuccess = true;
            that.callback(that.result);
        };

        sheet.onerror = function () {
            that.callback(that.result);
        }

        document.head.append(sheet);
    }

    load();
}

ResourceLoader.prototype.sound = function (src) {
    var that = this;
    function load() {
        var sound = new Howl({
            src: src,
            autoplay: false,
            preload: true,
            loop: false,
            volume: 1,

            onload: function () {
                that.result.file = sound;
                that.result.isSuccess = true;
                that.callback(that.result);
            },
            onerror: function (e) {
                that.callback(that.result);
            }
        })
    }

    load();
}

ResourceLoader.prototype.json = function (src) {
    var that = this;
    this.requestMaker(src, function (r, e) {
        if (r) {
            that.result.isSuccess = true;
            that.callback(that.result);
        }
        else {
            that.callback(that.result);
        }
    });
}

ResourceLoader.prototype.font = function (src) {
    var that = this;
    this.requestMaker(src, function (r, e) {
        if (r) {
            that.result.isSuccess = true;
            that.callback(that.result);
        }
        else {
            that.callback(that.result);
        }
    });
}

ResourceLoader.prototype.requestMaker = function (src, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if ((request.readyState == 4) && (request.status == 200))
            callback(true, request.responseText);
        if ((request.readyState == 4) && (request.status >= 400 || request.status >= 500))
            callback(false, request.responseText);
    }
    request.open("GET", src, true);
    request.send();
}