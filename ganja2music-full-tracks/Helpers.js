if (typeof String.prototype.includesAny !== 'function') {
    String.prototype.includesAny = function (searchStrings) {
        return searchStrings.some(searchString => this.includes(searchString));
    };
}

if (typeof String.prototype.isEnglish !== 'function') {
    String.prototype.isEnglish = function () {
        return /[a-zA-Z]/.test(this);
    };
}