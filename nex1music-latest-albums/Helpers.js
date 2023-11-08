export function runAfterDelay(callback, delay) {
    setTimeout(callback, delay * 60000);
}

if (typeof String.prototype.isEnglish !== 'function') {
    String.prototype.isEnglish = function () {
        return /[a-zA-Z]/.test(this);
    };
}